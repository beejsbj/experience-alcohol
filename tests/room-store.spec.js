import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { useSessionStore } from "../src/stores/session";
import { parseRoomCode, roomCodeFromHash, makeRoomCode, useRoomStore } from "../src/stores/room";

// In-memory stand-in for WebRTC: every phone that connects with the same code
// hears the others. Deliveries are async, like the real thing.
const makeBus = () => {
  const rooms = new Map();
  return ({ code, onPeerJoin, onPeerLeave, onMessage }) => {
    const members = rooms.get(code) ?? new Map();
    rooms.set(code, members);
    const selfId = `peer-${members.size + 1}-${Math.random().toString(36).slice(2, 6)}`;
    const deliver = (fn) => Promise.resolve().then(fn);
    for (const [otherId, other] of members) {
      deliver(() => other.onPeerJoin(selfId));
      deliver(() => onPeerJoin(otherId));
    }
    members.set(selfId, { onPeerJoin, onPeerLeave, onMessage });
    return Promise.resolve({
      send: (type, data, target) => {
        const payload = JSON.parse(JSON.stringify(data));
        for (const [otherId, other] of members) {
          if (otherId === selfId || (target && target !== otherId)) continue;
          deliver(() => other.onMessage(type, payload, selfId));
        }
      },
      leave: () => {
        members.delete(selfId);
        for (const other of members.values()) deliver(() => other.onPeerLeave(selfId));
      },
    });
  };
};

const createStorageMock = () => {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
};

// A phone: its own pinia and its own localStorage.
const makePhone = () => {
  const storage = createStorageMock();
  globalThis.localStorage = storage;
  const pinia = createPinia();
  setActivePinia(pinia);
  const session = useSessionStore();
  const room = useRoomStore();
  return {
    session,
    room,
    use: () => {
      globalThis.localStorage = storage;
      setActivePinia(pinia);
    },
  };
};

const settle = async () => {
  for (let i = 0; i < 6; i++) {
    await vi.advanceTimersByTimeAsync(200);
    await nextTick();
  }
};

describe("room codes", () => {
  it("makes readable codes and finds them in a link", () => {
    const code = makeRoomCode();
    expect(code).toMatch(/^[a-z0-9]{5}-[a-z0-9]{5}$/);
    expect(roomCodeFromHash(`#t=${code}`)).toBe(code);
    expect(roomCodeFromHash("#nothing")).toBeNull();
  });

  it("reads a code however it's typed or pasted", () => {
    const code = makeRoomCode();
    expect(parseRoomCode(code)).toBe(code);
    expect(parseRoomCode(code.toUpperCase().replace("-", " "))).toBe(code);
    expect(parseRoomCode(` ${code.replace("-", "")} `)).toBe(code);
    expect(parseRoomCode(`https://experience-alcohol.vercel.app/#t=${code}`)).toBe(code);
    expect(parseRoomCode("abc")).toBeNull();
    expect(parseRoomCode("")).toBeNull();
    expect(parseRoomCode("https://example.com/#nope")).toBeNull();
  });
});

describe("room table", () => {
  let bus;
  beforeEach(() => {
    vi.useFakeTimers();
    bus = makeBus();
  });

  it("a friend joins by link, sits at the same table, and pours sync both ways", async () => {
    const host = makePhone();
    host.session.logDrink(1, { type: "beer", abv: 0.05, volume: 12 });
    await host.room.resume({ hash: "", transport: bus });
    await host.room.startRoom();
    const code = host.room.code;

    const guest = makePhone();
    guest.session.logDrink(1, { type: "shot", abv: 0.4, volume: 1.5 }); // their solo night
    await guest.room.resume({ hash: `#t=${code}`, transport: bus });
    await settle();

    expect(guest.room.awaitingTable).toBe(false);
    expect(guest.session.session.id).toBe(host.session.session.id);
    expect(guest.session.session.events).toHaveLength(1);
    expect(host.room.peerCount).toBe(1);
    expect(guest.room.peerCount).toBe(1);
    // The guest's solo night is kept aside, not lost.
    expect(globalThis.localStorage.getItem("experience-alcohol:session:before-room")).toContain("shot");

    guest.use();
    const me = guest.session.addPerson({ name: "ria" });
    guest.room.claim(me);
    guest.session.logDrink(me, { type: "wine", abv: 0.12, volume: 5 });
    await settle();

    expect(host.session.person(me)?.name).toBe("ria");
    expect(host.session.session.events).toHaveLength(2);
    expect(host.room.heldElsewhere.has(me)).toBe(true);

    host.use();
    host.session.logDrink(me, { type: "beer", abv: 0.05, volume: 12 });
    await settle();
    expect(guest.session.eventsFor(me)).toHaveLength(2);
  });

  it("closing the tab ends this phone's seat at the table", async () => {
    const host = makePhone();
    await host.room.resume({ hash: "", transport: bus });
    await host.room.startRoom();
    const guest = makePhone();
    await guest.room.resume({ hash: `#t=${host.room.code}`, transport: bus });
    await settle();

    host.use();
    host.session.logDrink(1, { type: "beer", abv: 0.05, volume: 12 });
    host.session.closeTab();
    await settle();

    expect(host.room.inRoom).toBe(false);
    expect(guest.room.peerCount).toBe(0);
    // The guest still has the night that was shared.
    expect(guest.session.session.events).toHaveLength(1);
  });

  it("a reload rejoins the same room without re-adopting", async () => {
    const host = makePhone();
    await host.room.resume({ hash: "", transport: bus });
    await host.room.startRoom();
    const code = host.room.code;
    const sessionId = host.session.session.id;

    // Same storage, fresh app.
    host.use();
    setActivePinia(createPinia());
    const reloaded = useRoomStore();
    await reloaded.resume({ hash: "", transport: bus });
    expect(reloaded.code).toBe(code);
    expect(reloaded.awaitingTable).toBe(false);
    expect(useSessionStore().session.id).toBe(sessionId);
  });
});
