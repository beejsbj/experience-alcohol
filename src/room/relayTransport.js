const HEARTBEAT_MS = 10000;
const POLL_MS = 2500;
const HIDDEN_POLL_MS = 15000;
const STALE_MS = 30000;
const MAX_BACKOFF_MS = 15000;
// A departure may hold the seat's next connection back for this long, no more.
const DEPARTURE_MS = 3000;
// Browsers refuse keepalive bodies over 64 KiB; stay clear of the envelope.
const KEEPALIVE_BYTES = 60000;
const encoder = new TextEncoder();
const pendingDepartures = new Map();

export async function deriveRoom(code) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(code), "PBKDF2", false, ["deriveBits"]);
  // Both the public locator and secret key require the slow KDF. The locator
  // reveals none of the separate key bytes and cannot cheaply verify guesses.
  const bytes = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode("experience-alcohol/rooms/v3"), iterations: 100000, hash: "SHA-256" }, material, 512));
  const key = await crypto.subtle.importKey("raw", bytes.slice(32), "AES-GCM", false, ["encrypt", "decrypt"]);
  return { room: Array.from(bytes.slice(0, 32), (b) => b.toString(16).padStart(2, "0")).join(""), key };
}

export async function encryptRecord(key, record) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(record))));
  const bytes = new Uint8Array(iv.length + ciphertext.length);
  bytes.set(iv); bytes.set(ciphertext, iv.length);
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
}

export async function decryptRecord(key, blob) {
  const bytes = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return JSON.parse(new TextDecoder().decode(plaintext));
}

export async function connectRelay({ code, onPeerJoin, onPeerLeave, onMessage, onError }) {
  const { room, key } = await deriveRoom(code);
  let device;
  // Tab-scoped identity survives reload without merging two open tabs' seats.
  try { device = globalThis.sessionStorage?.getItem("experience-alcohol:relay-device:v3"); } catch { /* storage may be disabled */ }
  if (!/^[a-f0-9]{32}$/.test(device ?? "")) {
    device = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    try { globalThis.sessionStorage?.setItem("experience-alcohol:relay-device:v3", device); } catch { /* ephemeral seat */ }
  }
  const seat = `${room}:${device}`;
  // A reconnect can start while the previous connection is still publishing
  // departure. Its first write must follow that final write, never precede it.
  const prior = pendingDepartures.get(seat);
  if (prior) {
    let timer;
    await Promise.race([prior.done, new Promise((resolve) => { timer = setTimeout(resolve, DEPARTURE_MS); })]);
    clearTimeout(timer);
    prior.abort(); // a stalled departure must not land after this connection's writes
  }
  const record = { hello: null, state: null };
  const peers = new Map();
  const departures = new Map();
  let closed = false, dirty = false, writing = null, polling = false;
  let pollTimer, failures = 0;
  const unhealthy = { read: false, write: false };
  let warned = false;
  const writes = new AbortController();
  const health = (direction, failed) => {
    if (closed) return;
    unhealthy[direction] = failed;
    const next = unhealthy.read || unhealthy.write;
    if (next !== warned) { warned = next; onError?.(next ? "can't reach the table" : null); }
  };
  const request = async (url, options) => {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error("relay unavailable");
    return response;
  };
  const write = () => {
    dirty = true;
    if (!writing) {
      writing = (async () => {
        while (dirty && !closed) {
          dirty = false;
          try {
            const blob = await encryptRecord(key, record);
            if (closed) break;
            await request("/api/room", { method: "POST", signal: writes.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room, device, blob }) });
            health("write", false);
          } catch { health("write", true); }
        }
      })().finally(() => { writing = null; });
    }
    return writing;
  };
  const visible = () => globalThis.document?.visibilityState !== "hidden";
  const prune = (entries = null) => {
    const now = Date.now();
    for (const [id, peer] of peers) {
      if (now - peer.t > STALE_MS || (entries && !entries[id])) {
        peers.delete(id); onPeerLeave?.(id);
      }
    }
  };
  const poll = async () => {
    if (closed || polling) return;
    clearTimeout(pollTimer);
    polling = true;
    try {
      const response = await request(`/api/room?room=${room}`);
      const { entries } = await response.json();
      if (!entries || typeof entries !== "object") throw new Error("invalid entries");
      if (closed) return;
      prune(entries);
      for (const id of departures.keys()) if (!entries[id]) departures.delete(id);
      for (const [id, entry] of Object.entries(entries)) {
        if (id === device || !Number.isFinite(entry.t) || Date.now() - entry.t > 600000) continue;
        const previous = peers.get(id);
        if (previous?.t === entry.t && previous?.blob === entry.blob) continue;
        let next;
        try { next = await decryptRecord(key, entry.blob); } catch { continue; }
        if (closed) return;
        if (!next || typeof next !== "object") continue;
        if (next.departed === true) {
          // Deliver the final snapshot without counting an absent phone as seated.
          if (departures.get(id) !== entry.blob && next.state != null) onMessage?.("state", next.state, id);
          departures.set(id, entry.blob);
          if (peers.delete(id)) onPeerLeave?.(id);
          continue;
        }
        if (Date.now() - entry.t > STALE_MS) continue;
        departures.delete(id);
        peers.set(id, { ...entry, record: next });
        if (!previous) onPeerJoin?.(id);
        for (const type of ["hello", "state"]) {
          if (next[type] != null && JSON.stringify(next[type]) !== JSON.stringify(previous?.record[type])) onMessage?.(type, next[type], id);
        }
      }
      failures = 0; health("read", false);
    } catch { if (!closed) { failures++; health("read", true); } }
    finally {
      polling = false;
      if (!closed) {
        prune();
        const delay = failures ? Math.min(POLL_MS * 2 ** Math.min(failures, 4), MAX_BACKOFF_MS) : POLL_MS;
        pollTimer = setTimeout(poll, visible() ? delay : HIDDEN_POLL_MS);
      }
    }
  };
  const wake = () => { if (visible()) void poll(); };
  globalThis.document?.addEventListener("visibilitychange", wake);
  globalThis.window?.addEventListener("online", poll);
  const heartbeat = setInterval(write, HEARTBEAT_MS);
  // Let the store hold the connection before peer callbacks arrive.
  pollTimer = setTimeout(poll, 0);
  return {
    send(type, data) {
      if (closed || !["hello", "state"].includes(type)) return Promise.resolve();
      record[type] = JSON.parse(JSON.stringify(data));
      return write();
    },
    leave() {
      if (closed) return;
      closed = true;
      writes.abort(); // a live write still in flight must not land after the departure
      clearTimeout(pollTimer); clearInterval(heartbeat);
      globalThis.document?.removeEventListener("visibilitychange", wake);
      globalThis.window?.removeEventListener("online", poll);
      // Retain an encrypted departure and its state through the relay's bounded
      // retention window. A hidden or temporarily disconnected peer can still poll it.
      record.departed = true;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEPARTURE_MS);
      const entry = {
        abort: () => controller.abort(),
        done: Promise.resolve(writing).then(async () => {
          const blob = await encryptRecord(key, record);
          if (controller.signal.aborted) return;
          const body = JSON.stringify({ room, device, blob, departed: true });
          await request("/api/room", { method: "POST", keepalive: encoder.encode(body).length <= KEEPALIVE_BYTES, signal: controller.signal, headers: { "Content-Type": "application/json" }, body });
        }).catch(() => {}).finally(() => {
          clearTimeout(timer);
          if (pendingDepartures.get(seat) === entry) pendingDepartures.delete(seat);
        }),
      };
      pendingDepartures.set(seat, entry);
    },
  };
}
