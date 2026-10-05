import { describe, expect, it } from "vitest";
import { LINES, TOPICS, barLine, barTopics, fillLine } from "../src/utils/barkeep";

const base = { pours: 2, sinceLastMin: 30, verdict: "ON PACE", state: "Pleasantly Relaxed", bac: 0.05, hour: 21, lastType: "beer", types: ["beer"] };

describe("the bar's library", () => {
  it("is big enough to go a whole night without repeating itself", () => {
    const all = TOPICS.flatMap((t) => LINES[t]);
    expect(all.length).toBeGreaterThan(280);
    expect(new Set(all).size).toBe(all.length);
    for (const line of all) {
      expect(line.length).toBeGreaterThan(3);
      expect(line.length).toBeLessThanOrEqual(90);
    }
  });

  it("always leads emergency lines with immediate help and keeps it when closing", () => {
    for (const line of LINES.getHelp) expect(line).toMatch(/^call emergency services now\./);
    expect(barTopics({ ...base, closing: true, bac: 0.35 })).toEqual([["getHelp", 1]]);
    expect(LINES.easyNow.join(" ")).not.toMatch(/one more/);
  });

  it("never jokes about driving", () => {
    for (const t of TOPICS) for (const line of LINES[t]) expect(line).not.toMatch(/\bdriv/i);
  });
});

describe("barTopics", () => {
  const names = (ctx) => barTopics(ctx).map(([t]) => t);

  it("goes serious and exclusive past cut-off, closing, and in real danger", () => {
    expect(barTopics({ ...base, verdict: "CUT OFF", bac: 0.26 })).toEqual([["cutOff", 1]]);
    expect(barTopics({ ...base, bac: 0.36 })).toEqual([["getHelp", 1]]);
    expect(barTopics({ ...base, closing: true, bac: 0.3 })).toEqual([["cutOff", 1]]);
    expect(barTopics({ ...base, closing: true })).toEqual([["closing", 1]]);
  });

  it("notices a fresh water, a first pour and a milestone", () => {
    expect(names({ ...base, lastType: "water", sinceLastMin: 2 })).toContain("water");
    expect(names({ ...base, lastType: "water", sinceLastMin: 40 })).not.toContain("water");
    expect(names({ ...base, pours: 1, sinceLastMin: 1 })).toContain("firstPour");
    expect(names({ ...base, pours: 5, sinceLastMin: 1 })).toContain("milestone");
    expect(names({ ...base, pours: 4, sinceLastMin: 1 })).not.toContain("milestone");
  });

  it("uses exact safety thresholds and never praises alcoholic custom water", () => {
    for (const bac of [0.245, 0.2499]) expect(names({ ...base, bac, verdict: "SLOW DOWN" })).not.toContain("cutOff");
    expect(barTopics({ ...base, bac: 0.25 })).toEqual([["cutOff", 1]]);
    expect(barTopics({ ...base, bac: 0.3499 })).toEqual([["cutOff", 1]]);
    expect(barTopics({ ...base, bac: 0.35 })).toEqual([["getHelp", 1]]);
    const topics = names({ ...base, lastType: "water", lastIsCustom: true, lastIsSoft: false, sinceLastMin: 0 });
    expect(topics).not.toContain("water");
    expect(topics).toContain("house");
  });

  it("follows the pace verdict and the feeling", () => {
    expect(names({ ...base, verdict: "SLOW DOWN" })).toContain("slowDown");
    expect(names({ ...base, verdict: "EASY NOW" })).toContain("easyNow");
    expect(names(base)).toContain("onPace");
    expect(names({ ...base, state: "Inhibitions Gone" })).toContain("loose");
    expect(names({ ...base, state: "Overconfident" })).toContain("wasted");
    expect(names({ ...base, state: "Sober", pours: 0 })).toContain("sober");
  });

  it("knows what is in the glass", () => {
    expect(names({ ...base, lastType: "shot" })).toContain("shots");
    expect(names({ ...base, lastType: "wine" })).toContain("wine");
    expect(names({ ...base, lastType: "margarita", lastIsCustom: true })).toContain("house");
    expect(names({ ...base, types: ["beer", "wine", "shot"] })).toContain("mixing");
    expect(names(base)).not.toContain("mixing");
  });

  it("sees the shape of the night: coming down, holding, the hour", () => {
    expect(names({ ...base, falling: true, sinceLastMin: 60 })).toContain("comingDown");
    expect(names({ ...base, falling: true, sinceLastMin: 20 })).not.toContain("comingDown");
    expect(names({ ...base, pinned: "Pleasantly Relaxed" })).toContain("holding");
    expect(names({ ...base, pinned: "Pleasantly Relaxed", verdict: "EASY NOW" })).not.toContain("holding");
    expect(names({ ...base, hour: 0 })).toContain("lateNight");
    expect(names({ ...base, hour: 3 })).toContain("smallHours");
    expect(names({ ...base, hour: 8 })).toContain("morning");
    expect(names({ ...base, hour: 15 })).toContain("early");
    expect(names({ ...base, hour: 21 })).not.toContain("early");
  });

  it("only uses the name when there is one, and always has banter", () => {
    expect(names({ ...base, name: "burooj" })).toContain("name");
    expect(names({ ...base, name: "  " })).not.toContain("name");
    expect(names(base)).toContain("banter");
  });
});

describe("barLine", () => {
  it("is the same line for the same moment, and a real one", () => {
    const a = barLine({ ...base, name: "burooj" }, "p1:2:ON PACE");
    expect(a).toEqual(barLine({ ...base, name: "burooj" }, "p1:2:ON PACE"));
    expect(LINES[a.topic].map((l) => fillLine(l, { ...base, name: "burooj" }))).toContain(a.text);
    expect(a.text).not.toMatch(/\{\w+\}/);
  });

  it("changes with the moment and spreads across topics", () => {
    const topics = new Set();
    for (let i = 0; i < 60; i += 1) topics.add(barLine({ ...base, name: "jo" }, `p1:${i}`).topic);
    expect(topics.size).toBeGreaterThan(4);
  });

  it("fills in the name, initials and pour count", () => {
    expect(fillLine("{name} / {initials} / {pours} / {tab}", { name: "burooj jaber", pours: 7, tab: "0420" })).toBe("burooj jaber / BJ / 7 / 0420");
    expect(fillLine("{name}", {})).toBe("you");
  });

  it("marks the exclusive ones so the paper can treat them differently", () => {
    expect(barLine({ ...base, closing: true }, "x").exclusive).toBe(true);
    expect(barLine(base, "x").exclusive).toBe(false);
  });
});
