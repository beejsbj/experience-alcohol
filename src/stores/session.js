import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { MAINTAINABLE_STATES, PERSON_COLORS } from "../constants";
import { calculateBACAtTime } from "../utils/bac";
import { feelingFor } from "../utils/feelings";
import { mergeSessions, sessionFingerprint } from "../utils/roomMerge";

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

const buildPerson = (id, overrides = {}, seat = 0) => ({
  id,
  name: "guest",
  weight: 78,
  gender: "male",
  color: PERSON_COLORS[seat % PERSON_COLORS.length],
  pinnedState: null,
  active: true,
  joinedAt: Date.now() + seat,
  ...overrides,
});

const createSession = (people = null) => ({
  id: uid(),
  nickname: "tonight",
  startedAt: new Date().toISOString(),
  people: people ?? [buildPerson(1, { name: "you" })],
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
    if (saved?.people?.length && Array.isArray(saved.events)) return saved;
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
  const eventsFor = (personId) =>
    session.value.events
      .filter((event) => event.personId === personId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Every edit to a person stamps a rev, so a room merge keeps the newest.
  const touch = (target) => {
    target.rev = { t: Date.now(), by: deviceId };
  };

  function addPerson(overrides = {}) {
    // Random ids: two phones tearing a receipt at once must not collide.
    const id = `p-${uid()}`;
    const added = buildPerson(id, overrides, session.value.people.length);
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
    if (!person(personId)) return;
    session.value.events.push({
      id: uid(),
      personId,
      type: drink.type,
      abv: drink.abv ?? drink.alcoholContent,
      volume: drink.volume,
      timestamp: new Date().toISOString(),
    });
  }

  function addCustomDrink(drink) {
    session.value.customDrinks.push({
      id: uid(),
      type: drink.type,
      abv: drink.abv,
      volume: drink.volume,
    });
  }

  function closeTab() {
    const closedAt = new Date().toISOString();
    const summary = session.value.people
      .map((p) => {
        const events = eventsFor(p.id);
        if (!events.length) return null;
        // BAC peaks just after a pour, so sampling each pour finds the night's peak
        const peakBAC = Math.max(
          ...events.map((event) =>
            calculateBACAtTime(events, p, new Date(event.timestamp).getTime() + 1000)
          )
        );
        return {
          name: p.name,
          // enough to redraw their window on the keepsake
          person: { ...p },
          events: events.map((event) => ({ ...event })),
          drinks: events.length,
          peakBAC,
          peakState: feelingFor(peakBAC).state,
        };
      })
      .filter(Boolean);

    lastTab.value = {
      nickname: session.value.nickname,
      startedAt: session.value.startedAt,
      closedAt,
      summary,
    };

    const carryOver = activePeople.value.map((p) => ({ ...p, pinnedState: null }));
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
    session.value = next;
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
    eventsFor,
    addPerson,
    updatePerson,
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
