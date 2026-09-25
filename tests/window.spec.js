import { describe, expect, it } from "vitest";
import { GLASS, LEAD_RINGS, feelingScale, paneBands, traceryCells, windowModel } from "../src/utils/window";

const person = { weight: 70, gender: "female" };
const t = (h, m = 0) => new Date(2026, 8, 24, h, m).getTime();
const pour = (id, type, time, abv = 0.05, volume = 12) => ({
  id,
  type,
  abv,
  volume,
  timestamp: new Date(time).toISOString(),
});

describe("windowModel", () => {
  it("is empty glass before the first pour", () => {
    const m = windowModel([], person, { now: t(20) });
    expect(m.wedges).toEqual([]);
    expect(m.bac).toBe(0);
  });

  it("lays one wedge per half hour, coloured by the last drink poured", () => {
    const events = [pour("a", "beer", t(20, 0)), pour("b", "wine", t(20, 25), 0.12, 5)];
    const m = windowModel(events, person, { now: t(20, 40) });
    const beerOnly = windowModel(events.slice(0, 1), person, { now: t(20, 40) });
    expect(beerOnly.wedges.map((w) => w.glass)).toEqual([GLASS.beer, GLASS.beer]);
    // 20:00–20:30 already holds the 20:25 wine, so both wedges are ruby
    expect(m.wedges.map((w) => w.glass)).toEqual([GLASS.wine, GLASS.wine]);
    expect(m.bac).toBeGreaterThan(0);
    expect(m.forecast.length).toBeGreaterThan(1);
    expect(m.pours).toHaveLength(2);
  });

  it("keeps the same shades on every render", () => {
    const events = [pour("a", "shot", t(21), 0.4, 1.5)];
    const a = windowModel(events, person, { now: t(21, 30) });
    const b = windowModel(events, person, { now: t(21, 30) });
    expect(a.wedges[0].shades).toEqual(b.wedges[0].shades);
  });

  it("names unknown drinks as hand-poured glass", () => {
    const m = windowModel([pour("a", "arak", t(22), 0.4, 1.5)], person, { now: t(22, 5) });
    expect(m.glass).toBe(GLASS.custom);
  });

  it("never wraps past one turn of the face", () => {
    const events = [pour("a", "beer", t(8)), pour("b", "beer", t(21))];
    const m = windowModel(events, person, { now: t(21, 30) });
    expect(m.start).toBeGreaterThanOrEqual(t(21, 30) - 11.5 * 3600000);
  });
});

describe("feelingScale", () => {
  it("gives every feeling an equal ring", () => {
    const scale = feelingScale({ inner: 40, outer: 160 });
    const widths = [0, ...LEAD_RINGS, 0.16].map(scale);
    const gaps = widths.slice(1).map((r, i) => r - widths[i]);
    gaps.forEach((g) => expect(g).toBeCloseTo(gaps[0]));
    expect(scale(1)).toBe(160);
    expect(scale(-1)).toBe(40);
  });

  it("tessellates the whole window", () => {
    expect(traceryCells()).toHaveLength(24 * (LEAD_RINGS.length + 1));
  });
});

describe("paneBands", () => {
  it("cuts a wedge at every lead ring it crosses", () => {
    expect(paneBands(0.005)).toEqual([[0, 0.005]]);
    const bands = paneBands(0.05);
    expect(bands[0][0]).toBe(0);
    expect(bands.at(-1)[1]).toBe(0.05);
    expect(bands).toHaveLength(LEAD_RINGS.filter((r) => r < 0.05).length + 1);
  });
});
