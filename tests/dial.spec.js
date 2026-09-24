import { describe, expect, it } from "vitest";
import { angleAt, angleSpan, areaPath, bandPath, makeScale, polar, ringSpot } from "../src/utils/dial";

const at = (h, m = 0) => new Date(2026, 8, 24, h, m).getTime();

describe("dial geometry", () => {
  it("maps wall-clock time onto a 12-hour face, 12 at the top", () => {
    expect(angleAt(at(0))).toBeCloseTo(0);
    expect(angleAt(at(15))).toBeCloseTo(Math.PI / 2);
    expect(angleAt(at(21))).toBeCloseTo((3 * Math.PI) / 2);
    const top = polar(100, 100, 50, 0);
    expect(top.x).toBeCloseTo(100);
    expect(top.y).toBeCloseTo(50);
  });

  it("measures spans clockwise across midnight and caps them below a turn", () => {
    expect(angleSpan(at(23), at(23) + 2 * 3600000)).toBeCloseTo(Math.PI / 3);
    expect(angleSpan(at(20), at(20) + 20 * 3600000)).toBeLessThan(Math.PI * 2);
    expect(angleSpan(at(22), at(21))).toBe(0);
  });

  it("clamps BAC into the band", () => {
    const scale = makeScale({ inner: 60, outer: 100, max: 0.1 });
    expect(scale(0)).toBe(60);
    expect(scale(0.05)).toBe(80);
    expect(scale(0.5)).toBe(100);
  });

  it("draws closed paths and nothing for empty input", () => {
    const scale = makeScale({ inner: 60, outer: 100 });
    const pts = [
      { time: at(20), bac: 0 },
      { time: at(21), bac: 0.05 },
      { time: at(22), bac: 0.03 },
    ];
    expect(areaPath(pts, { cx: 100, cy: 100, scale, inner: 60 })).toMatch(/^M.*Z$/);
    expect(areaPath(pts.slice(0, 1), { cx: 100, cy: 100, scale, inner: 60 })).toBe("");
    expect(bandPath(at(20), at(23), 70, 80, { cx: 100, cy: 100 })).toMatch(/^M.*Z$/);
  });

  it("sets each ring in the same spot forever, inside the field", () => {
    const a = ringSpot("pour-1", { cx: 100, cy: 100, field: 40 });
    const b = ringSpot("pour-1", { cx: 100, cy: 100, field: 40 });
    expect(a).toEqual(b);
    expect(Math.hypot(a.x - 100, a.y - 100)).toBeLessThanOrEqual(40);
    expect(ringSpot("pour-2", { cx: 100, cy: 100, field: 40 })).not.toEqual(a);
  });
});
