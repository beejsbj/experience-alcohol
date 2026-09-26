import { describe, expect, it } from "vitest";
import {
  DOODLE_NAMES,
  drawDoodle,
  friendMarks,
  friendNote,
  underlinePath,
  underlineStyle,
  UNDERLINES,
} from "../src/utils/doodles";

describe("drawDoodle", () => {
  it("draws every shape as real path data, the same way each time", () => {
    for (const name of DOODLE_NAMES) {
      const a = drawDoodle(name, "s");
      expect(a).toEqual(drawDoodle(name, "s"));
      if (name.startsWith("word:")) expect(a.word).toBe(name.slice(5));
      else {
        expect(a.paths.length).toBeGreaterThan(0);
        for (const d of a.paths) expect(d).toMatch(/^M-?\d/);
        expect(a.paths.join(" ")).not.toContain("NaN");
      }
    }
  });

  it("wobbles differently for a different hand", () => {
    expect(drawDoodle("star", "a").paths[0]).not.toBe(drawDoodle("star", "b").paths[0]);
  });
});

describe("friendMarks", () => {
  const inks = ["#111", "#222"];

  it("starts with a couple and fills up as the table drinks", () => {
    expect(friendMarks("p1", 0, inks, "#000", 8)).toHaveLength(2);
    const early = friendMarks("p1", 3, inks, "#000", 8);
    const late = friendMarks("p1", 30, inks, "#000", 8);
    expect(early.length).toBeGreaterThan(0);
    expect(late).toHaveLength(8);
    // marks already on the paper stay put as more arrive
    for (const m of early) expect(late.find((l) => l.slot === m.slot)).toMatchObject({ name: m.name, ink: m.ink });
  });

  it("never repeats a doodle on one receipt and uses friends' pens", () => {
    const marks = friendMarks("p2", 30, inks, "#000", 8);
    expect(new Set(marks.map((m) => m.name)).size).toBe(marks.length);
    for (const m of marks) expect(inks).toContain(m.ink);
  });

  it("falls back to your own pen when you're drinking alone", () => {
    for (const m of friendMarks("p3", 30, [], "#abc", 8)) expect(m.ink).toBe("#abc");
  });
});

describe("underlines", () => {
  it("stays neat when sober and gets loopy further in", () => {
    for (let n = 0; n < 4; n += 1) {
      expect(["swash", "double"]).toContain(underlineStyle("x", 0, n));
      expect(["loops", "zigzag", "scribble"]).toContain(underlineStyle("x", 0.14, n));
    }
  });

  it("draws every style without NaNs", () => {
    for (const style of UNDERLINES) {
      const paths = underlinePath(style, "seed", 236, 0.5);
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.join(" ")).not.toContain("NaN");
    }
  });
});

describe("friendNote", () => {
  it("fits the note to the pace and signs it from someone at the table", () => {
    const friends = [{ name: "ren" }, { name: "jo" }];
    const n = friendNote("p1", "SLOW DOWN", friends);
    expect(n).toEqual(friendNote("p1", "SLOW DOWN", friends));
    expect(friends).toContain(n.from);
    expect(n.text.length).toBeGreaterThan(3);
    expect(friendNote("p1", "ON PACE", []).from).toBeNull();
  });
});
