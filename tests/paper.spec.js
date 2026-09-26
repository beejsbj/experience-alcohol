import { describe, expect, it } from "vitest";
import { barcode, ringFor, tornEdge } from "../src/utils/paper";
import { clock, peakBAC, standardDrinks, tabNumbers } from "../src/utils/receipt";

describe("tornEdge", () => {
  it("tears the same way for the same seed", () => {
    expect(tornEdge("maya")).toBe(tornEdge("maya"));
    expect(tornEdge("maya")).not.toBe(tornEdge("jonah"));
  });

  it("spans the full width at both ends and stays inside the tooth depth", () => {
    const clip = tornEdge("x", { depth: 7 });
    expect(clip.startsWith("polygon(0.00% ")).toBe(true);
    const points = clip.slice(8, -1).split(", ");
    const tops = points.filter((p) => !p.includes("calc"));
    const bottoms = points.filter((p) => p.includes("calc"));
    expect(tops.at(-1).startsWith("100.00%")).toBe(true);
    expect(bottoms[0].startsWith("100.00%")).toBe(true);
    expect(bottoms.at(-1).startsWith("0.00%")).toBe(true);
    for (const p of tops) {
      const y = parseFloat(p.split(" ")[1]);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(7);
    }
  });

  it("can leave the top edge straight", () => {
    expect(tornEdge("x", { top: false }).startsWith("polygon(0% 0px, 100% 0px,")).toBe(true);
  });
});

describe("barcode", () => {
  it("is deterministic with twelve digits and increasing bars", () => {
    const a = barcode("s1");
    expect(a).toEqual(barcode("s1"));
    expect(a.digits).toMatch(/^\d{12}$/);
    for (let i = 1; i < a.bars.length; i += 1) {
      expect(a.bars[i].x).toBeGreaterThan(a.bars[i - 1].x + a.bars[i - 1].w - 1);
    }
    expect(a.width).toBeGreaterThan(a.bars.at(-1).x);
  });
});

describe("ringFor", () => {
  const event = { id: "e1", type: "beer", timestamp: new Date(0).toISOString() };

  it("sets the glass down in the same place every time", () => {
    const a = ringFor(event, 60000);
    const b = ringFor(event, 60000 * 90);
    expect(a.x).toBe(b.x);
    expect(a.y).toBe(b.y);
    expect(a.r).toBe(b.r);
    expect(a.x).toBeGreaterThanOrEqual(4);
    expect(a.x).toBeLessThanOrEqual(96);
  });

  it("dries out over time", () => {
    expect(ringFor(event, 0).wet).toBe(1);
    expect(ringFor(event, 60000 * 10).wet).toBeCloseTo(0.6, 5);
    expect(ringFor(event, 60000 * 60).wet).toBe(0);
  });

  it("leaves a smaller ring for a shot than a pint", () => {
    const shot = ringFor({ ...event, type: "shot" }, 0);
    const pint = ringFor(event, 0);
    expect(shot.r).toBeLessThan(pint.r);
  });
});

describe("receipt facts", () => {
  const person = { weight: 80, gender: "male" };
  const at = (min) => new Date(Date.UTC(2026, 0, 1, 20, min)).toISOString();

  it("counts standard drinks from pure alcohol", () => {
    const events = [
      { abv: 0.05, volume: 12 }, // beer = 1
      { abv: 0.15, volume: 8 }, // cocktail = 2
      { alcoholContent: 0.4, volume: 1.5 }, // legacy shot = 1
    ];
    expect(standardDrinks(events)).toBeCloseTo(4, 5);
    expect(standardDrinks([])).toBe(0);
  });

  it("finds the night's peak, which is never below now", () => {
    const events = [
      { abv: 0.05, volume: 12, timestamp: at(0) },
      { abv: 0.05, volume: 12, timestamp: at(30) },
    ];
    const later = new Date(at(0)).getTime() + 3 * 3600000;
    const peak = peakBAC(events, person, later);
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeGreaterThanOrEqual(peakBAC(events, person, later + 3600000));
    expect(peakBAC([], person, later)).toBe(0);
  });

  it("numbers a night's table and tab the same way every time", () => {
    const n = tabNumbers("session-a");
    expect(n).toEqual(tabNumbers("session-a"));
    expect(n.table).toMatch(/^\d{2}$/);
    expect(n.tab).toMatch(/^\d{4}$/);
  });

  it("prints a 24h clock", () => {
    const d = new Date(2026, 0, 1, 7, 5);
    expect(clock(d.getTime())).toBe("07:05");
  });
});
