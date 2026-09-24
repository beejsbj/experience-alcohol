import { describe, expect, it } from "vitest";
import { mergeSessions, sessionFingerprint } from "../src/utils/roomMerge";

const person = (id, rev, extra = {}) => ({
  id,
  name: id,
  weight: 70,
  gender: "female",
  pinnedState: null,
  active: true,
  joinedAt: 1,
  rev,
  ...extra,
});

const pour = (id, personId, minute) => ({
  id,
  personId,
  type: "beer",
  abv: 0.05,
  volume: 12,
  timestamp: new Date(Date.UTC(2026, 8, 24, 20, minute)).toISOString(),
});

const base = () => ({
  id: "s1",
  nickname: "tonight",
  startedAt: "2026-09-24T20:00:00.000Z",
  people: [person("host", { t: 1, by: "d-a" }, { joinedAt: 1 })],
  events: [],
  customDrinks: [],
});

describe("mergeSessions", () => {
  it("unions pours from both devices and orders them by time", () => {
    const a = { ...base(), events: [pour("e1", "host", 5)] };
    const b = { ...base(), events: [pour("e2", "host", 1), pour("e1", "host", 5)] };
    const merged = mergeSessions(a, b);
    expect(merged.events.map((e) => e.id)).toEqual(["e2", "e1"]);
  });

  it("keeps the newest edit of a person, device id breaking ties", () => {
    const a = { ...base(), people: [person("host", { t: 5, by: "d-a" }, { name: "old" })] };
    const b = { ...base(), people: [person("host", { t: 9, by: "d-b" }, { name: "new" })] };
    expect(mergeSessions(a, b).people[0].name).toBe("new");
    expect(mergeSessions(b, a).people[0].name).toBe("new");

    const tieA = { ...base(), people: [person("host", { t: 5, by: "d-a" }, { name: "a" })] };
    const tieB = { ...base(), people: [person("host", { t: 5, by: "d-b" }, { name: "b" })] };
    expect(mergeSessions(tieA, tieB).people[0].name).toBe("b");
    expect(mergeSessions(tieB, tieA).people[0].name).toBe("b");
  });

  it("adds people only one side has, seated in join order", () => {
    const a = { ...base() };
    const b = {
      ...base(),
      people: [
        ...base().people,
        person("p-late", { t: 2, by: "d-b" }, { joinedAt: 30 }),
        person("p-early", { t: 2, by: "d-c" }, { joinedAt: 20 }),
      ],
    };
    expect(mergeSessions(a, b).people.map((p) => p.id)).toEqual(["host", "p-early", "p-late"]);
  });

  it("is commutative, associative and idempotent", () => {
    const a = { ...base(), events: [pour("e1", "host", 1)] };
    const b = {
      ...base(),
      people: [...base().people, person("p-b", { t: 3, by: "d-b" }, { joinedAt: 2 })],
      events: [pour("e2", "p-b", 2)],
      customDrinks: [{ id: "c1", type: "arak", abv: 0.4, volume: 1.5 }],
    };
    const c = {
      ...base(),
      people: [person("host", { t: 7, by: "d-c" }, { pinnedState: "Pleasantly Relaxed" })],
      startedAt: "2026-09-24T19:00:00.000Z",
    };
    const fp = (s) => sessionFingerprint(s);
    expect(fp(mergeSessions(a, b))).toBe(fp(mergeSessions(b, a)));
    expect(fp(mergeSessions(mergeSessions(a, b), c))).toBe(fp(mergeSessions(a, mergeSessions(b, c))));
    const all = mergeSessions(mergeSessions(a, b), c);
    expect(fp(mergeSessions(all, all))).toBe(fp(all));
    expect(all.startedAt).toBe("2026-09-24T19:00:00.000Z");
    expect(all.people.find((p) => p.id === "host").pinnedState).toBe("Pleasantly Relaxed");
  });

  it("treats people saved before revs existed as oldest", () => {
    const legacy = { ...base(), people: [person("host", undefined, { name: "legacy" })] };
    const edited = { ...base(), people: [person("host", { t: 1, by: "d-a" }, { name: "edited" })] };
    expect(mergeSessions(legacy, edited).people[0].name).toBe("edited");
  });
});
