import { describe, expect, it } from "vitest";
import { scatter, scatterRand } from "../src/utils/scatter";

describe("scatter", () => {
  it("is deterministic for the same seed", () => {
    expect(scatter("s1:p1:name")).toEqual(scatter("s1:p1:name"));
  });

  it("differs between seeds", () => {
    expect(scatter("s1:p1:name").transform).not.toBe(scatter("s1:p2:name").transform);
  });

  it("respects bounds", () => {
    for (let i = 0; i < 50; i += 1) {
      const rand = scatterRand(`seed-${i}`);
      const value = rand();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    const { transform } = scatter("bounds-check", { r: 3, x: 5, y: 4 });
    const [, dx, dy, rot] = transform.match(
      /translate\((-?[\d.]+)px, (-?[\d.]+)px\) rotate\((-?[\d.]+)deg\)/
    );
    expect(Math.abs(Number(dx))).toBeLessThanOrEqual(5);
    expect(Math.abs(Number(dy))).toBeLessThanOrEqual(4);
    expect(Math.abs(Number(rot))).toBeLessThanOrEqual(3);
  });
});
