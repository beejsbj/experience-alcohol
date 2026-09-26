import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { useSessionStore } from "./session";
import { sessionFingerprint } from "../utils/roomMerge";

// A room is one session shared by every phone at the table. Each phone keeps
// its own full copy; on every change it sends the whole session to the others,
// who fold it in with mergeSessions(). Snapshots are a few KB, so resending the
// lot is simpler and sturdier than shipping individual edits.

const ROOM_KEY = "experience-alcohol:room";
const STASH_KEY = "experience-alcohol:session:before-room";
const CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const SEND_DEBOUNCE_MS = 120;

const getStorage = () => globalThis.localStorage ?? null;

export const makeRoomCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const chars = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
};

export const roomCodeFromHash = (hash) => {
  const match = /[#&]t=([a-z0-9-]{6,32})/.exec(hash ?? "");
  return match ? match[1] : null;
};

// Whatever someone types or pastes — the code in any case, spaced or dashed,
// or the whole link — back to a table code. Null if it can't be one.
export const parseRoomCode = (input) => {
  const text = String(input ?? "").trim().toLowerCase();
  const hash = text.indexOf("#");
  if (hash !== -1) return parseRoomCode(roomCodeFromHash(text.slice(hash)) ?? "");
  const chars = [...text].filter((c) => CODE_ALPHABET.includes(c)).join("");
  if (chars.length !== 10) return null;
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
};

const defaultTransport = (options) =>
  import("../room/trysteroTransport").then((m) => m.connectTrystero(options));

export const useRoomStore = defineStore("room", () => {
  const session = useSessionStore();

  const code = ref(null);
  const status = ref("solo"); // 'solo' | 'searching' | 'connected'
  const awaitingTable = ref(false); // joined by link, no snapshot seen yet
  const roomSessionId = ref(null); // the session this table shares
  const myPersonId = ref(null);
  const peers = ref({}); // peerId -> { deviceId, personId }
  const error = ref(null);

  let transport = null;
  let connectTransport = defaultTransport;
  let sendTimer = null;
  let lastSent = null;

  const inRoom = computed(() => code.value !== null);
  const peerCount = computed(() => Object.keys(peers.value).length);
  const link = computed(() =>
    code.value ? `${globalThis.location?.origin ?? ""}/#t=${code.value}` : null
  );
  // Receipts someone else is holding right now, keyed by person id.
  const heldElsewhere = computed(() => {
    const held = new Set();
    for (const peer of Object.values(peers.value)) if (peer.personId) held.add(peer.personId);
    return held;
  });

  const persist = () => {
    const storage = getStorage();
    if (!storage) return;
    if (!code.value) return storage.removeItem(ROOM_KEY);
    storage.setItem(
      ROOM_KEY,
      JSON.stringify({
        code: code.value,
        sessionId: roomSessionId.value,
        myPersonId: myPersonId.value,
      })
    );
  };

  const hello = () => ({ deviceId: session.deviceId, personId: myPersonId.value });
  const snapshot = () => JSON.parse(JSON.stringify(session.session));

  function sendState(peerId) {
    if (!transport || awaitingTable.value) return;
    transport.send("state", snapshot(), peerId);
  }

  function scheduleBroadcast() {
    if (!transport || awaitingTable.value) return;
    clearTimeout(sendTimer);
    sendTimer = setTimeout(() => {
      const fingerprint = sessionFingerprint(session.session);
      if (fingerprint === lastSent) return;
      lastSent = fingerprint;
      sendState();
    }, SEND_DEBOUNCE_MS);
  }

  function receiveState(remote) {
    if (!remote?.id || !Array.isArray(remote.people)) return;
    if (awaitingTable.value) {
      // First sight of the table: keep any solo night aside, then sit down.
      const storage = getStorage();
      if (session.session.events.length && storage) {
        storage.setItem(STASH_KEY, JSON.stringify(session.session));
      }
      awaitingTable.value = false;
      roomSessionId.value = remote.id;
      session.adoptSession(remote);
      persist();
      return;
    }
    session.mergeRemote(remote);
  }

  async function connect() {
    status.value = "searching";
    error.value = null;
    const joining = code.value;
    const connection = await connectTransport({
      code: joining,
      onPeerJoin: (peerId) => {
        peers.value = { ...peers.value, [peerId]: { deviceId: null, personId: null } };
        status.value = "connected";
        transport?.send("hello", hello(), peerId);
        sendState(peerId);
      },
      onPeerLeave: (peerId) => {
        const { [peerId]: _, ...rest } = peers.value;
        peers.value = rest;
        if (!Object.keys(rest).length) status.value = "searching";
      },
      onMessage: (type, data, peerId) => {
        if (type === "hello") {
          peers.value = { ...peers.value, [peerId]: { deviceId: data?.deviceId, personId: data?.personId } };
          status.value = "connected";
        } else if (type === "state") {
          receiveState(data);
        }
      },
      onError: (message) => {
        error.value = String(message);
      },
    });
    // Left (or switched rooms) while the transport was loading.
    if (code.value !== joining) return connection.leave();
    transport = connection;
  }

  // `parting` is a last snapshot to hand the table before walking away.
  function disconnect(parting = null) {
    clearTimeout(sendTimer);
    const closing = transport;
    if (closing && parting) {
      Promise.resolve(closing.send("state", JSON.parse(JSON.stringify(parting))))
        .catch(() => {})
        .finally(() => closing.leave());
    } else {
      closing?.leave();
    }
    transport = null;
    lastSent = null;
    peers.value = {};
    status.value = "solo";
  }

  // Open this phone's current night to the table.
  async function startRoom() {
    if (inRoom.value) return;
    code.value = makeRoomCode();
    awaitingTable.value = false;
    roomSessionId.value = session.session.id;
    myPersonId.value = session.focusedPersonId ?? session.activePeople[0]?.id ?? null;
    persist();
    await connect();
  }

  // Sit down at someone else's table from their link.
  async function joinRoom(roomCode) {
    if (code.value === roomCode) return;
    if (inRoom.value) disconnect();
    code.value = roomCode;
    awaitingTable.value = true;
    roomSessionId.value = null;
    myPersonId.value = null;
    persist();
    await connect();
  }

  function leaveRoom(parting = null) {
    disconnect(parting);
    code.value = null;
    awaitingTable.value = false;
    roomSessionId.value = null;
    myPersonId.value = null;
    persist();
  }

  function claim(personId) {
    myPersonId.value = personId;
    persist();
    if (!transport) return;
    for (const peerId of Object.keys(peers.value)) transport.send("hello", hello(), peerId);
  }

  // Pick up where we were after a reload: same room, same seat.
  async function resume({ hash, transport: customTransport } = {}) {
    if (customTransport) connectTransport = customTransport;
    const linked = roomCodeFromHash(hash ?? globalThis.location?.hash);
    const saved = (() => {
      try {
        return JSON.parse(getStorage()?.getItem(ROOM_KEY) || "null");
      } catch {
        return null;
      }
    })();

    if (linked) globalThis.history?.replaceState(null, "", globalThis.location.pathname);
    if (linked && linked !== saved?.code) return joinRoom(linked);
    if (!saved?.code) return;
    code.value = saved.code;
    myPersonId.value = saved.myPersonId ?? null;
    // Only trust the saved seat if we're still holding that room's session.
    awaitingTable.value = !saved.sessionId || saved.sessionId !== session.session.id;
    roomSessionId.value = awaitingTable.value ? null : saved.sessionId;
    await connect();
  }

  watch(
    () => session.session,
    (next, previous) => {
      // Closing the tab starts a new session, so it's also the end of this
      // table. Hand over the night as it stood, then go.
      if (inRoom.value && roomSessionId.value && next.id !== roomSessionId.value) {
        leaveRoom(previous?.id === roomSessionId.value ? previous : null);
        return;
      }
      scheduleBroadcast();
    },
    { deep: true }
  );

  return {
    code,
    status,
    awaitingTable,
    myPersonId,
    peers,
    error,
    inRoom,
    peerCount,
    link,
    heldElsewhere,
    startRoom,
    joinRoom,
    leaveRoom,
    claim,
    resume,
  };
});
