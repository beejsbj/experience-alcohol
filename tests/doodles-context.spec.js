import { describe, expect, it, vi } from "vitest";
import { DOODLE_NAMES, LEDGER_POOLS, drawDoodle, friendMarks, ledgerContext, ledgerMarks, stateMark } from "../src/utils/doodles";

const person = { weight: 78, gender: "male" };
const T0 = new Date("2026-10-03T21:00:00").getTime();
const ev = (i, type, abv, volume, min) => ({ id: `e${i}`, type, abv, volume, t: T0 + min * 60000 });

describe("the bigger library", () => {
  it("has well over fifty doodles and every one draws clean", () => {
    expect(DOODLE_NAMES.length).toBeGreaterThan(90);
    for (const name of DOODLE_NAMES) {
      const d = drawDoodle(name, "x");
      if (name.startsWith("word:")) expect(d.word.length).toBeGreaterThan(0);
      else {
        expect(d.paths.length).toBeGreaterThan(0);
        expect(d.paths.join(" ")).not.toContain("NaN");
      }
    }
  });

  it("keeps the drink glasses out of the random paper marks", () => {
    const names = new Set(friendMarks("p", 99, ["#111"], "#000", 8).map((m) => m.name));
    for (const n of ["pint", "shotglass", "martini", "wineglass", "drop"]) expect(names.has(n)).toBe(false);
  });

  it("adds initials without replacing marks present before introduction", () => {
    for (let i = 0; i < 40; i++) {
      const before = friendMarks(`p${i}`, 0, [], "#abc", 8, { name: "" });
      const after = friendMarks(`p${i}`, 99, [], "#abc", 8, { name: "burooj jaber" });
      for (const mark of before) expect(after.find((m) => m.slot === mark.slot)).toEqual(mark);
    }
  });

  it("can write your initials and knows when the tab opened", () => {
    let found = false;
    for (let i = 0; i < 40 && !found; i += 1) {
      found = friendMarks(`p${i}`, 99, ["#111"], "#000", 8, { name: "burooj jaber" }).some((m) => m.name === "word:BJ");
    }
    expect(found).toBe(true);
    const twice = friendMarks("p1", 99, ["#111"], "#000", 8, { name: "ren o" }).filter((m) => m.name === "word:RO");
    expect(twice.length).toBeLessThanOrEqual(1);
    expect(friendMarks("p1", 0, ["#111"], "#000", 8)).toEqual(friendMarks("p1", 0, ["#111"], "#000", 8, {}));
  });
});

describe("ledgerMarks", () => {
  const night = [
    ev(0, "beer", 0.05, 12, 0),
    ev(1, "water", 0, 12, 20),
    ev(2, "shot", 0.4, 1.5, 40),
    ev(3, "wine", 0.12, 5, 55),
    ev(4, "cocktail", 0.15, 8, 70),
    ev(5, "margarita", 0.14, 8, 130),
  ];
  for (let i = 0; i < night.length; i++) night[i].ledgerContext = ledgerContext(night.slice(0, i), night[i], person, { ownInk: "#abc" });

  it("gives one slot per line, deterministically", () => {
    const a = ledgerMarks("p1", night, person, { inks: ["#111", "#222"] });
    expect(a).toHaveLength(night.length);
    expect(a).toEqual(ledgerMarks("p1", night, person, { inks: ["#111", "#222"] }));
    expect(a.some(Boolean)).toBe(true);
  });

  it("never changes a line's mark as the ledger grows", () => {
    const early = ledgerMarks("p1", night.slice(0, 3), person, {});
    const late = ledgerMarks("p1", night, person, {});
    expect(late.slice(0, 3)).toEqual(early);
  });

  it("draws what the line says: water gets water, a shot gets a shot", () => {
    for (let k = 0; k < 30; k += 1) {
      const marks = ledgerMarks(`p${k}`, night, person, {});
      if (marks[1]) expect(LEDGER_POOLS.water).toContain(marks[1].name);
      if (marks[2]) expect([...LEDGER_POOLS.shot, ...LEDGER_POOLS.gap]).toContain(marks[2].name);
      // the margarita is a house special, the fifth pour, and an hour after the last
      if (marks[5]) expect([...LEDGER_POOLS.house, ...LEDGER_POOLS.gap, ...LEDGER_POOLS.fifth, ...LEDGER_POOLS.loose]).toContain(marks[5].name);
    }
  });

  it("notices milestones, the small hours and a long gap", () => {
    const shots = Array.from({ length: 10 }, (_, i) => ev(i, "shot", 0.4, 1.5, i * 5));
    for (let i = 0; i < shots.length; i++) shots[i].ledgerContext = ledgerContext(shots.slice(0, i), shots[i], person);
    const seen = new Set();
    for (let k = 0; k < 60; k += 1) {
      const marks = ledgerMarks(`m${k}`, shots, person, {});
      for (const m of marks) if (m) seen.add(m.name);
    }
    expect([...seen].some((n) => [...LEDGER_POOLS.tenth, ...LEDGER_POOLS.fifth].includes(n))).toBe(true);
    expect([...seen].some((n) => LEDGER_POOLS.wasted.includes(n))).toBe(true);

    const late = [{ id: "l", type: "beer", abv: 0.05, volume: 12, t: new Date("2026-10-04T02:30:00").getTime() }];
    late[0].ledgerContext = ledgerContext([], late[0], person);
    const lateSeen = new Set();
    for (let k = 0; k < 60; k += 1) {
      const [m] = ledgerMarks(`l${k}`, late, person, {});
      if (m) lateSeen.add(m.name);
    }
    expect([...lateSeen].some((n) => LEDGER_POOLS.late.includes(n))).toBe(true);
  });

  it("freezes contextual ink and marks through earlier peer pours and roster edits", () => {
    const event = { ...night[3], ledgerContext: ledgerContext(night.slice(0, 3), night[3], person, { inks: ["#111"] }) };
    for (let k = 0; k < 60; k++) {
      const [before] = ledgerMarks(`p${k}`, [event], person, { ownInk: "#abc" });
      const after = ledgerMarks(`p${k}`, [ev("peer", "shot", 0.4, 5, -10), event], { weight: 40, gender: "female" }, { inks: ["#222"], ownInk: "#abc" })[1];
      expect(after).toEqual(before);
      if (before) expect(before.ink).toBe("#111");
    }
  });

  it("freezes the originating hour and keeps legacy marks independent of timezone", () => {
    const hour = vi.spyOn(Date.prototype, "getHours");
    try {
      hour.mockReturnValue(2);
      const event = { ...night[0] };
      event.ledgerContext = ledgerContext([], event, person);
      expect(event.ledgerContext.hour).toBe(2);
      const legacy = { ...event };
      delete legacy.ledgerContext;
      const before = Array.from({ length: 60 }, (_, i) => ledgerMarks(`tz${i}`, [event, legacy], person));
      hour.mockReturnValue(14);
      expect(Array.from({ length: 60 }, (_, i) => ledgerMarks(`tz${i}`, [event, legacy], person))).toEqual(before);
    } finally { hour.mockRestore(); }
  });

  it("keeps legacy marks stable on out-of-order insertion", () => {
    const old = { ...night[2] };
    delete old.ledgerContext;
    for (let k = 0; k < 60; k++) {
      const [before] = ledgerMarks(`old${k}`, [old], person, { ownInk: "#abc" });
      const after = ledgerMarks(`old${k}`, [night[0], old], person, { inks: ["#222"], ownInk: "#abc" })[1];
      expect(after).toEqual(before);
      if (before) expect(before.ink).toBe("#abc");
    }
  });
});

describe("stateMark", () => {
  it("draws the level, and the shape of the night when that matters more", () => {
    expect(stateMark({ state: "Sober" }, "s").name).toBe("face_neutral");
    expect(["face_dizzy", "face_x"]).toContain(stateMark({ state: "Overconfident" }, "s").name);
    expect(stateMark({ state: "Definitely Tipsy", verdict: "CUT OFF" }, "s").key).toBe("cutoff");
    expect(stateMark({ state: "Definitely Tipsy", lastType: "water", sinceLastMin: 0 }, "s").key).toBe("water");
    expect(stateMark({ state: "Definitely Tipsy", pinned: "Definitely Tipsy", verdict: "ON PACE", pours: 3 }, "s").key).toBe("held");
    expect(stateMark({ state: "Definitely Tipsy", sinceLastMin: 60, pours: 3 }, "s").key).toBe("down");
    expect(stateMark({ state: "Sober", sinceLastMin: 60, pours: 3 }, "s").key).toBe("Sober");
  });

  it("is stable for a key and seed", () => {
    expect(stateMark({ state: "Inhibitions Gone" }, "a")).toEqual(stateMark({ state: "Inhibitions Gone" }, "a"));
  });
});
