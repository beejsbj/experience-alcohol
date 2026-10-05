import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "../src/stores/session";
import { tabNumbers } from "../src/utils/receipt";

const createStorageMock = (seed = {}) => {
  const data = new Map(Object.entries(seed));
  return {
    getItem: vi.fn((key) => (data.has(key) ? data.get(key) : null)),
    setItem: vi.fn((key, value) => data.set(key, value)),
    removeItem: vi.fn((key) => data.delete(key)),
    clear: vi.fn(() => data.clear()),
  };
};

describe("session store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    globalThis.localStorage = createStorageMock();
  });

  it("starts with one focused person and no events", () => {
    const store = useSessionStore();
    expect(store.activePeople).toHaveLength(1);
    expect(store.focusedPersonId).toBe(store.activePeople[0].id);
    expect(store.session.events).toHaveLength(0);
  });

  it("logs drinks as append-only events and persists them", async () => {
    const store = useSessionStore();
    store.logDrink(1, { type: "beer", abv: 0.05, volume: 12 });
    await nextTick();
    expect(store.eventsFor(1)).toHaveLength(1);
    const persisted = JSON.parse(globalThis.localStorage.setItem.mock.calls.at(-1)[1]);
    expect(persisted.events).toHaveLength(1);
    expect(persisted.events[0].abv).toBe(0.05);
    expect(persisted.events[0].id).toBeTruthy();
  });

  it("persists custom identity even when a name matches a default", async () => {
    const store = useSessionStore();
    store.logDrink(1, { id: "custom-water", type: "water", abv: 0.2, volume: 5 });
    store.logDrink(1, { type: "water", abv: 0, volume: 12 });
    await nextTick();
    expect(store.eventsFor(1)[0]).toMatchObject({ isCustom: true, drinkId: "custom-water" });
    expect(store.eventsFor(1)[1]).toMatchObject({ isCustom: false });
    const saved = JSON.parse(globalThis.localStorage.setItem.mock.calls.at(-1)[1]);
    expect(saved.events[0].drinkId).toBe("custom-water");
  });

  it("omits water-only guests from the closing summary", () => {
    const store = useSessionStore();
    store.logDrink(1, { type: "water", abv: 0, volume: 12 });
    const drinker = store.addPerson({ name: "sam" });
    store.logDrink(drinker, { type: "beer", abv: 0.05, volume: 12 });
    store.logDrink(drinker, { type: "water", abv: 0, volume: 12 });
    store.closeTab();
    expect(store.lastTab.summary).toHaveLength(1);
    expect(store.lastTab.summary[0]).toMatchObject({ name: "sam", drinks: 1 });
  });

  it("leaves a water-only night with the empty closing summary", () => {
    const store = useSessionStore();
    store.logDrink(1, { type: "water", abv: 0, volume: 12 });
    store.closeTab();
    expect(store.lastTab.summary).toEqual([]);
  });

  it("retains the live emergency estimate when closing the tab", () => {
    const store = useSessionStore();
    for (let i = 0; i < 20; i++) store.logDrink(1, { type: "shot", abv: 0.4, volume: 1.5 });
    store.closeTab();
    expect(store.lastTab.summary[0].closingBAC).toBeGreaterThan(0.35);
  });

  it("refreshes paper inks and names for the next night", () => {
    const store = useSessionStore();
    store.introduce(1, { name: "Sam", gender: "male", weight: 78 });
    const ren = store.addPerson({ name: "Ren", needsIntro: false, color: "#111" });
    const ria = store.addPerson({ name: "Ria", needsIntro: false, color: "#222" });
    store.deactivatePerson(ren);
    store.updatePerson(1, { name: "Robin" });
    expect(store.person(1).paperName).toBe("Sam");
    store.closeTab();
    expect(store.person(1).paperName).toBe("Robin");
    expect(store.person(1).paperInks).toEqual(["#222"]);
    expect(store.person(ria).paperInks).toEqual([store.person(1).color]);
  });

  it("backfills local paper metadata once and retains a valid tab if saving fails", () => {
    const saved = { id: "saved", startedAt: "2026-10-03T21:00:00Z", people: [{ id: 1, name: "Sam", active: true }], events: [], customDrinks: [] };
    const hour = vi.spyOn(Date.prototype, "getHours").mockReturnValue(2);
    try {
      globalThis.localStorage = createStorageMock({ "experience-alcohol:session:v2": JSON.stringify(saved) });
      const store = useSessionStore();
      expect(store.session.startedHour).toBe(2);
      expect(store.person(1).paperName).toBe("Sam");
      const upgraded = JSON.parse(globalThis.localStorage.getItem("experience-alcohol:session:v2"));
      expect(upgraded.startedHour).toBe(2);
      hour.mockReturnValue(14);
      setActivePinia(createPinia());
      expect(useSessionStore().session.startedHour).toBe(2);
      setActivePinia(createPinia());
      globalThis.localStorage = createStorageMock({ "experience-alcohol:session:v2": JSON.stringify(saved), "experience-alcohol:device": "existing" });
      globalThis.localStorage.setItem.mockImplementation(() => { throw new Error("quota"); });
      expect(useSessionStore().session.id).toBe("saved");
    } finally { hour.mockRestore(); }
  });

  it("freezes names at legacy room ingress and retains metadata-only room changes", () => {
    const store = useSessionStore();
    store.adoptSession({ id: "legacy", startedAt: "2026-10-03T21:00:00Z", people: [{ id: 1, name: "Sam", active: true }], events: [], customDrinks: [] });
    store.updatePerson(1, { name: "Robin" });
    expect(store.person(1).paperName).toBe("Sam");
    const remote = JSON.parse(JSON.stringify(store.session));
    remote.startedHour = 2;
    expect(store.mergeRemote(remote)).toBe(true);
    expect(store.session.startedHour).toBe(2);
    remote.people[0] = { ...remote.people[0], name: "Alex", rev: { t: Date.now() + 1, by: "peer" } };
    delete remote.people[0].paperName;
    store.mergeRemote(remote);
    expect(store.person(1).name).toBe("Alex");
    expect(store.person(1).paperName).toBe("Sam");
  });

  it("captures active introduced friends' inks once when upgrading a local tab", () => {
    const saved = { id: "saved", startedAt: "2026-10-03T21:00:00Z", people: [
      { id: 1, name: "Sam", color: "#111", active: true },
      { id: 2, name: "Ren", color: "#222", active: true },
      { id: 3, name: "Ria", color: "#333", active: false },
      { id: 4, name: "", color: "#444", active: true, needsIntro: true },
    ], events: [], customDrinks: [] };
    globalThis.localStorage = createStorageMock({ "experience-alcohol:session:v2": JSON.stringify(saved) });
    const store = useSessionStore();
    expect(store.person(1).paperInks).toEqual(["#222"]);
    expect(store.person(2).paperInks).toEqual(["#111"]);
    const upgraded = JSON.parse(globalThis.localStorage.getItem("experience-alcohol:session:v2"));
    expect(upgraded.people[0].paperInks).toEqual(["#222"]);
    upgraded.people[1].color = "#555";
    globalThis.localStorage.setItem("experience-alcohol:session:v2", JSON.stringify(upgraded));
    setActivePinia(createPinia());
    expect(useSessionStore().person(1).paperInks).toEqual(["#222"]);
  });

  it("freezes a newly received legacy guest and retains metadata-only enrichment", () => {
    const store = useSessionStore();
    const remote = JSON.parse(JSON.stringify(store.session));
    remote.people.push({ id: "legacy-peer", name: "Sam Jones", active: true, needsIntro: false, weight: 78, gender: "male", color: "#111" });
    expect(store.mergeRemote(remote)).toBe(true);
    expect(store.person("legacy-peer").paperName).toBe("Sam Jones");
    store.updatePerson("legacy-peer", { name: "Robin Doe" });
    expect(store.person("legacy-peer").paperName).toBe("Sam Jones");
    delete store.person("legacy-peer").paperName;
    const enriched = JSON.parse(JSON.stringify(store.session));
    enriched.people.find((p) => p.id === "legacy-peer").paperName = "Sam Jones";
    expect(store.mergeRemote(enriched)).toBe(true);
    expect(store.person("legacy-peer").paperName).toBe("Sam Jones");
    expect(store.mergeRemote(enriched)).toBe(false);
  });

  it("pins and clears a vibe", () => {
    const store = useSessionStore();
    store.pinVibe(1, "Pleasantly Relaxed");
    expect(store.person(1).pinnedState).toBe("Pleasantly Relaxed");
    store.pinVibe(1, null);
    expect(store.person(1).pinnedState).toBeNull();
  });

  it("refuses to deactivate the last active person", () => {
    const store = useSessionStore();
    expect(store.deactivatePerson(1)).toBe(false);
    store.addPerson({ name: "sam" });
    expect(store.deactivatePerson(1)).toBe(true);
    expect(store.activePeople).toHaveLength(1);
    expect(store.focusedPersonId).toBe(store.activePeople[0].id);
  });

  it("closing the tab summarises the night, clears events, keeps people", () => {
    const store = useSessionStore();
    const openSessionId = store.session.id;
    const openTabNumber = tabNumbers(openSessionId).tab;
    store.logDrink(1, { type: "shot", abv: 0.4, volume: 1.5 });
    store.closeTab();
    expect(store.lastTab.sessionId).toBe(openSessionId);
    expect(tabNumbers(store.lastTab.sessionId).tab).toBe(openTabNumber);
    expect(store.lastTab.summary).toHaveLength(1);
    expect(store.lastTab.summary[0].drinks).toBe(1);
    expect(store.lastTab.summary[0].peakBAC).toBeGreaterThan(0);
    expect(store.lastTab.summary[0].peakState).toBeTruthy();
    expect(store.session.events).toHaveLength(0);
    expect(store.activePeople).toHaveLength(1);
    expect(store.person(1).pinnedState).toBeNull();
  });

  it("migrates a legacy v1 session and removes the old key", () => {
    globalThis.localStorage = createStorageMock({
      "experience-alcohol:fab-layout:v1": JSON.stringify({
        people: [
          {
            id: 1,
            name: "Saved",
            weight: 82,
            gender: "male",
            color: "#B85C38",
            maintainTargetState: "Pleasantly Relaxed",
          },
        ],
        customDrinks: [{ id: "custom-1", type: "Spritz", alcoholContent: 0.08, volume: 10 }],
        liveDrinkTracking: {
          1: {
            drinkHistory: [
              { type: "Beer", alcoholContent: 0.05, volume: 12, timestamp: new Date().toISOString() },
            ],
            currentBAC: 0,
          },
        },
      }),
    });
    setActivePinia(createPinia());
    const store = useSessionStore();
    expect(store.person(1).name).toBe("Saved");
    expect(store.person(1).pinnedState).toBe("Pleasantly Relaxed");
    expect(store.eventsFor(1)).toHaveLength(1);
    expect(store.eventsFor(1)[0].abv).toBe(0.05);
    expect(store.session.customDrinks[0].abv).toBe(0.08);
    expect(globalThis.localStorage.removeItem).toHaveBeenCalledWith(
      "experience-alcohol:fab-layout:v1"
    );
  });
  it("gives torn receipts unique ids and stamps every edit", () => {
    const store = useSessionStore();
    const a = store.addPerson({ name: "sam" });
    const b = store.addPerson({ name: "ria" });
    expect(a).not.toBe(b);
    expect(typeof a).toBe("string");
    store.updatePerson(a, { weight: 64 });
    expect(store.person(a).rev.by).toBe(store.deviceId);
  });

  it("two devices sharing a session converge through mergeRemote", () => {
    const host = useSessionStore();
    host.logDrink(1, { type: "beer", abv: 0.05, volume: 12 });
    const snapshot = JSON.parse(JSON.stringify(host.session));

    setActivePinia(createPinia());
    globalThis.localStorage = createStorageMock();
    const guest = useSessionStore();
    guest.adoptSession(snapshot);
    const me = guest.addPerson({ name: "guest" });
    guest.logDrink(me, { type: "wine", abv: 0.12, volume: 5 });

    expect(host.mergeRemote(JSON.parse(JSON.stringify(guest.session)))).toBe(true);
    expect(host.session.events).toHaveLength(2);
    expect(host.person(me).name).toBe("guest");
    // Nothing new the second time round.
    expect(host.mergeRemote(JSON.parse(JSON.stringify(guest.session)))).toBe(false);
  });

  it("assumes nothing about a new face: asks, then remembers the answers", () => {
    const store = useSessionStore();
    const first = store.activePeople[0];
    expect(first.needsIntro).toBe(true);
    expect(first.name).toBe("");

    const id = store.addPerson();
    expect(store.person(id).needsIntro).toBe(true);
    // a different pen from whoever's already at the table
    expect(store.person(id).color).not.toBe(first.color);

    store.introduce(id, { name: "  ria ", gender: "female", weight: 58 });
    const ria = store.person(id);
    expect(ria).toMatchObject({ name: "ria", gender: "female", weight: 58, needsIntro: false });
    expect(ria.rev.by).toBe(store.deviceId);
  });

  it("fills a skipped name with the seat and keeps weight sane", () => {
    const store = useSessionStore();
    store.introduce(1, { name: "", gender: "male", weight: 9000 });
    expect(store.person(1).name).toBe("guest 1");
    expect(store.person(1).weight).toBe(250);
  });

  it("keeps the vessel a house special was written for", () => {
    const store = useSessionStore();
    store.addCustomDrink({ type: "tallboy", abv: 0.05, volume: 16, vessel: "can" });
    expect(store.session.customDrinks[0].vessel).toBe("can");
  });

  it("ignores snapshots from a different session", () => {
    const store = useSessionStore();
    expect(store.mergeRemote({ ...store.session, id: "other", events: [{ id: "x" }] })).toBe(false);
    expect(store.session.events).toHaveLength(0);
  });
});
