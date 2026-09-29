const HEARTBEAT_MS = 10000;
const POLL_MS = 2500;
const HIDDEN_POLL_MS = 15000;
const STALE_MS = 30000;
const MAX_BACKOFF_MS = 15000;
const encoder = new TextEncoder();

export async function deriveRoom(code) {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(`experience-alcohol/rooms/v2:${code}`));
  const material = await crypto.subtle.importKey("raw", encoder.encode(code), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: encoder.encode("experience-alcohol/rooms/v2"), iterations: 100000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  return { room: [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join(""), key };
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
  const device = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const record = { hello: null, state: null };
  const peers = new Map();
  let closed = false, dirty = false, writing = null, polling = false;
  let pollTimer, failures = 0, failed = false;
  const failure = () => {
    failures++;
    if (!failed) { failed = true; onError?.("can't reach the table"); }
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
            await request("/api/room", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room, device, blob }) });
          } catch { failure(); }
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
      for (const [id, entry] of Object.entries(entries)) {
        if (id === device || !Number.isFinite(entry.t) || Date.now() - entry.t > STALE_MS) continue;
        const previous = peers.get(id);
        if (previous?.t === entry.t && previous?.blob === entry.blob) continue;
        let next;
        try { next = await decryptRecord(key, entry.blob); } catch { continue; }
        if (closed) return;
        if (!next || typeof next !== "object") continue;
        peers.set(id, { ...entry, record: next });
        if (!previous) onPeerJoin?.(id);
        for (const type of ["hello", "state"]) {
          if (next[type] != null && JSON.stringify(next[type]) !== JSON.stringify(previous?.record[type])) onMessage?.(type, next[type], id);
        }
      }
      // back in touch — take the warning down
      if (failed) onError?.(null);
      failures = 0; failed = false;
    } catch { if (!closed) failure(); }
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
      closed = true;
      clearTimeout(pollTimer); clearInterval(heartbeat);
      globalThis.document?.removeEventListener("visibilitychange", wake);
      globalThis.window?.removeEventListener("online", poll);
      // An in-flight write must finish before deleting the seat.
      Promise.resolve(writing).finally(() => fetch(`/api/room?room=${room}&device=${device}`, { method: "DELETE", keepalive: true }).catch(() => {}));
    },
  };
}
