import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useAlcoholStore } from "../src/stores/alcohol";

const createStorageMock = (seed = {}) => {
  const data = new Map(Object.entries(seed));

  return {
    getItem: vi.fn((key) => (data.has(key) ? data.get(key) : null)),
    setItem: vi.fn((key, value) => data.set(key, value)),
    removeItem: vi.fn((key) => data.delete(key)),
    clear: vi.fn(() => data.clear()),
  };
};

describe("alcohol store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    globalThis.localStorage = createStorageMock();
  });

  it("persists drink history and maintain targets", async () => {
    const store = useAlcoholStore();

    store.addDrinkForPerson(1, {
      type: "Beer",
      alcoholContent: 0.05,
      volume: 12,
    });
    store.setMaintainTarget(1, "Definitely Tipsy");

    await nextTick();

    const latestWrite = globalThis.localStorage.setItem.mock.calls.at(-1);
    const persisted = JSON.parse(latestWrite[1]);

    expect(persisted.people[0].maintainTargetState).toBe("Definitely Tipsy");
    expect(persisted.liveDrinkTracking["1"].drinkHistory).toHaveLength(1);
  });

  it("persists custom drink types", async () => {
    const store = useAlcoholStore();

    store.addCustomDrink({
      type: "Spritz",
      alcoholContent: 0.08,
      volume: 10,
    });

    await nextTick();

    const latestWrite = globalThis.localStorage.setItem.mock.calls.at(-1);
    const persisted = JSON.parse(latestWrite[1]);

    expect(persisted.customDrinks).toHaveLength(1);
    expect(persisted.customDrinks[0].type).toBe("Spritz");
  });

  it("hydrates people and tracking from local storage", () => {
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
        customDrinks: [
          {
            id: "custom-1",
            type: "Spritz",
            glyph: "S",
            alcoholContent: 0.08,
            volume: 10,
          },
        ],
        liveDrinkTracking: {
          1: {
            drinkHistory: [
              {
                type: "Beer",
                alcoholContent: 0.05,
                volume: 12,
                timestamp: new Date().toISOString(),
              },
            ],
            currentBAC: 0,
          },
        },
      }),
    });

    setActivePinia(createPinia());
    const store = useAlcoholStore();

    expect(store.people[0].name).toBe("Saved");
    expect(store.people[0].maintainTargetState).toBe("Pleasantly Relaxed");
    expect(store.customDrinks).toHaveLength(1);
    expect(store.liveDrinkTracking[1].drinkHistory).toHaveLength(1);
    expect(store.liveDrinkTracking[1].currentBAC).toBeGreaterThan(0);
  });
});
