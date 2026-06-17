import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "../src/stores/session";

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
    store.logDrink(1, { type: "shot", abv: 0.4, volume: 1.5 });
    store.closeTab();
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
});
