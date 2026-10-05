import { defineStore } from "pinia";
import { computed, ref, toRaw, watch } from "vue";
import { MAINTAINABLE_STATES, PERSON_COLORS } from "../constants";
import { calculateBACAtTime, calculateClosingBAC } from "../utils/bac";
import { feelingFor } from "../utils/feelings";
import { ledgerContext } from "../utils/doodles";
import { pourCount } from "../utils/receipt";
import { captureLegacyPaperName, mergeSessions, sessionFingerprint } from "../utils/roomMerge";

const STORAGE_KEY = "experience-alcohol:session:v2";
const LEGACY_KEY = "experience-alcohol:fab-layout:v1";
const DEVICE_KEY = "experience-alcohol:device";

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const getStorage = () => (typeof globalThis === "undefined" ? null : globalThis.localStorage ?? null);

// One id per browser, so a room can tell whose edit came last.
const loadDeviceId = () => {
  const storage = getStorage();
  const saved = storage?.getItem(DEVICE_KEY);
  if (saved) return saved;
  const id = `d-${uid()}`;
  storage?.setItem(DEVICE_KEY, id);
  return id;
};

const buildPerson = (id, overrides = {}, seat = 0) => {
  const person = {
    id,
    name: "guest",
    weight: 78,
    gender: "male",
    color: PERSON_COLORS[seat % PERSON_COLORS.length],
    pinnedState: null,
    paperInks: [],
    active: true,
    joinedAt: Date.now() + seat,
    ...overrides,
  };
  return { ...person, paperName: person.needsIntro ? "" : person.name, paperNameBackfillRev: undefined };
};

// A fresh face at the table: nothing assumed. The receipt asks for a name,
// a body for the math and a weight before the first pour (`needsIntro`).
// The pen is handed over at random from the inks nobody's holding yet.
const pickPen = (people = []) => {
  const taken = new Set(people.filter((p) => p.active !== false).map((p) => p.color));
  const free = PERSON_COLORS.filter((c) => !taken.has(c));
  const pool = free.length ? free : PERSON_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
};

const createSession = (people = null) => ({
  id: uid(),
  nickname: "tonight",
  startedAt: new Date().toISOString(),
  startedHour: new Date().getHours(),
  people: people ?? [buildPerson(1, { name: "", needsIntro: true, color: pickPen() })],
  events: [],
  customDrinks: [],
});

const migrateLegacy = (raw) => {
  try {
    const legacy = JSON.parse(raw);
    if (!Array.isArray(legacy?.people) || !legacy.people.length) return null;

    const people = legacy.people.map((person, index) =>
      buildPerson(
        Number(person.id) || index + 1,
        {
          name: person.name || `guest ${index + 1}`,
          weight: Number(person.weight) || 78,
          gender: person.gender === "female" ? "female" : "male",
          pinnedState: person.maintainTargetState ?? null,
        },
        index
      )
    );
    const events = Object.entries(legacy.liveDrinkTracking ?? {}).flatMap(
      ([personId, tracking]) =>
        (tracking?.drinkHistory ?? []).map((drink) => ({
          id: uid(),
          personId: Number(personId),
          type: (drink.type || "drink").toLowerCase(),
          abv: Number(drink.alcoholContent) || 0.05,
          volume: Number(drink.volume) || 12,
          timestamp: drink.timestamp ?? new Date().toISOString(),
        }))
    );
    const customDrinks = (legacy.customDrinks ?? []).map((drink) => ({
      id: drink.id || uid(),
      type: (drink.type || "custom").toLowerCase(),
      abv: Number(drink.alcoholContent) || 0.05,
      volume: Number(drink.volume) || 12,
    }));
    const timestamps = events.map((event) => new Date(event.timestamp).getTime());

    return {
      ...createSession(people),
      events,
      customDrinks,
      startedHour: timestamps.length ? new Date(Math.min(...timestamps)).getHours() : new Date().getHours(),
      startedAt: timestamps.length
        ? new Date(Math.min(...timestamps)).toISOString()
        : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const loadSession = () => {
  const storage = getStorage();
  if (!storage) return createSession();

  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
    if (saved?.people?.length && Array.isArray(saved.events)) {
      // A local upgrade knows this device's local start hour. Capture it once;
      // incoming legacy room snapshots still use the deterministic UTC fallback.
      let upgraded = false;
      if (saved.startedHour == null) {
        saved.startedHour = new Date(saved.startedAt).getHours();
        upgraded = true;
      }
      for (const person of saved.people) {
        if (person.paperName == null) {
          Object.assign(person, captureLegacyPaperName(person));
          upgraded = true;
        }
        if (!Array.isArray(person.paperInks)) {
          person.paperInks = [...new Set(saved.people.filter((friend) => friend.id !== person.id && friend.active !== false && !friend.needsIntro).map((friend) => friend.color).filter(Boolean))].sort();
          upgraded = true;
        }
      }
      if (upgraded) {
        try { storage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch {
          // A full/read-only store must not discard a valid loaded night.
        }
      }
      return saved;
    }
  } catch {
    // corrupt v2 payload — fall through to legacy/fresh
  }

  const legacyRaw = storage.getItem(LEGACY_KEY);
  if (legacyRaw) {
    const migrated = migrateLegacy(legacyRaw);
    if (migrated) {
      storage.removeItem(LEGACY_KEY);
      return migrated;
    }
  }
  return createSession();
};

export const useSessionStore = defineStore("session", () => {
  const deviceId = loadDeviceId();
  const session = ref(loadSession());
  const focusedPersonId = ref(session.value.people.find((p) => p.active)?.id ?? 1);
  const lastTab = ref(null);

  const activePeople = computed(() => session.value.people.filter((p) => p.active));

  const person = (id) => session.value.people.find((p) => p.id === id) ?? null;
  // Grouped and time-sorted once per change to the log, not once per caller
  // per tick. Each event also carries `t` (ms), so the math skips re-parsing
  // ISO timestamps on every sample.
  const eventsByPerson = computed(() => {
    const groups = new Map();
    for (const event of session.value.events) {
      const list = groups.get(event.personId) ?? [];
      list.push({ ...toRaw(event), t: new Date(event.timestamp).getTime() });
      groups.set(event.personId, list);
    }
    for (const list of groups.values()) list.sort((a, b) => a.t - b.t);
    return groups;
  });
  const NO_EVENTS = Object.freeze([]);
  const eventsFor = (personId) => eventsByPerson.value.get(personId) ?? NO_EVENTS;

  // Every edit to a person stamps a rev, so a room merge keeps the newest.
  const touch = (target) => {
    target.rev = { t: Date.now(), by: deviceId };
  };

  function addPerson(overrides = {}) {
    // Random ids: two phones tearing a receipt at once must not collide.
    const id = `p-${uid()}`;
    const added = buildPerson(
      id,
      { needsIntro: true, color: pickPen(session.value.people), paperInks: [...new Set(activePeople.value.filter((p) => !p.needsIntro).map((p) => p.color))].sort(), ...overrides },
      session.value.people.length
    );
    touch(added);
    session.value.people.push(added);
    focusedPersonId.value = id;
    return id;
  }

  function updatePerson(id, updates) {
    const target = person(id);
    if (!target) return;
    Object.assign(target, updates, { id });
    touch(target);
  }

  // The questions on a fresh receipt have been answered.
  function introduce(id, { name, gender, weight }) {
    const target = person(id);
    if (!target) return;
    const seat = session.value.people.filter((p) => p.active).findIndex((p) => p.id === id) + 1;
    Object.assign(target, {
      name: name?.trim() || `guest ${seat || session.value.people.length}`,
      gender: gender === "female" ? "female" : "male",
      weight: Math.min(250, Math.max(30, Number(weight) || 78)),
      needsIntro: false,
      ...(target.paperName ? {} : { paperName: name?.trim() || `guest ${seat || session.value.people.length}`, paperNameBackfillRev: undefined }),
    });
    touch(target);
  }

  function deactivatePerson(id) {
    if (activePeople.value.length <= 1) return false;
    const target = person(id);
    if (!target) return false;
    target.active = false;
    touch(target);
    if (focusedPersonId.value === id) focusedPersonId.value = activePeople.value[0].id;
    return true;
  }

  function setFocus(id) {
    if (person(id)?.active) focusedPersonId.value = id;
  }

  function pinVibe(personId, stateName) {
    const target = person(personId);
    if (!target) return;
    target.pinnedState = MAINTAINABLE_STATES.some((s) => s.state === stateName)
      ? stateName
      : null;
    touch(target);
  }

  function logDrink(personId, drink) {
    const target = person(personId);
    if (!target) return;
    const event = {
      id: uid(),
      personId,
      type: drink.type,
      isCustom: Boolean(drink.id),
      ...(drink.id ? { drinkId: drink.id } : {}),
      abv: drink.abv ?? drink.alcoholContent,
      volume: drink.volume,
      timestamp: new Date().toISOString(),
    };
    const friends = activePeople.value.filter((p) => p.id !== personId && !p.needsIntro);
    event.ledgerContext = ledgerContext(eventsFor(personId), event, target, {
      inks: [...new Set(friends.map((p) => p.color))].sort(),
      ownInk: target.color,
      startedAt: session.value.startedAt,
    });
    session.value.events.push(event);
  }

  function addCustomDrink(drink) {
    session.value.customDrinks.push({
      id: uid(),
      type: drink.type,
      abv: drink.abv,
      volume: drink.volume,
      ...(drink.vessel ? { vessel: drink.vessel } : {}),
    });
  }

  function closeTab() {
    const closedAt = new Date().toISOString();
    const summary = session.value.people
      .map((p) => {
        const events = eventsFor(p.id);
        if (!pourCount(events)) return null;
        // BAC peaks just after a pour, so sampling each pour finds the night's peak
        const peakBAC = Math.max(
          ...events.map((event) =>
            calculateBACAtTime(events, p, new Date(event.timestamp).getTime() + 1000)
          )
        );
        return {
          name: p.name,
          color: p.color,
          drinks: pourCount(events),
          peakBAC,
          closingBAC: calculateClosingBAC(events, p, new Date(closedAt).getTime()),
          peakState: feelingFor(peakBAC).state,
        };
      })
      .filter(Boolean);

    lastTab.value = {
      sessionId: session.value.id,
      nickname: session.value.nickname,
      startedAt: session.value.startedAt,
      closedAt,
      summary,
    };

    const carryOver = activePeople.value.map((p) => ({
      ...p,
      pinnedState: null,
      paperName: p.needsIntro ? "" : p.name,
      paperNameBackfillRev: undefined,
      paperInks: [...new Set(activePeople.value.filter((friend) => friend.id !== p.id && !friend.needsIntro).map((friend) => friend.color))].sort(),
    }));
    session.value = createSession(carryOver);
    focusedPersonId.value = carryOver[0]?.id ?? 1;
  }

  // Fold another device's copy of this session into ours. Returns true when
  // anything changed.
  function mergeRemote(remote) {
    if (!remote || remote.id !== session.value.id) return false;
    const before = sessionFingerprint(session.value);
    const merged = mergeSessions(session.value, remote);
    if (sessionFingerprint(merged) === before) return false;
    session.value = merged;
    if (!person(focusedPersonId.value)?.active) focusedPersonId.value = activePeople.value[0]?.id;
    return true;
  }

  // Swap in a whole session, e.g. the one a room already shares.
  function adoptSession(next) {
    session.value = { ...next, people: next.people.map(captureLegacyPaperName) };
    focusedPersonId.value = activePeople.value[0]?.id ?? null;
  }

  function dismissLastTab() {
    lastTab.value = null;
  }

  watch(
    session,
    () => {
      const storage = getStorage();
      if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(session.value));
    },
    { deep: true }
  );

  return {
    deviceId,
    session,
    focusedPersonId,
    lastTab,
    activePeople,
    person,
    eventsByPerson,
    eventsFor,
    addPerson,
    updatePerson,
    introduce,
    deactivatePerson,
    setFocus,
    pinVibe,
    logDrink,
    addCustomDrink,
    closeTab,
    mergeRemote,
    adoptSession,
    dismissLastTab,
  };
});
