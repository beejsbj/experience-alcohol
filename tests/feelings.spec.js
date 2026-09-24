import { describe, expect, it } from "vitest";
import {
  CUTOFF_BAC,
  feelingFor,
  nextPourMinutes,
  stampFor,
  targetDetails,
} from "../src/utils/feelings";

describe("feelings", () => {
  it("maps BAC to feeling states", () => {
    expect(feelingFor(0).state).toBe("Sober");
    expect(feelingFor(0.05).state).toBe("Pleasantly Relaxed");
    expect(feelingFor(0.08).state).toBe("Definitely Tipsy");
    expect(feelingFor(0.4).state).toBe("Life Threatening");
  });

  it("resolves maintainable target details by name", () => {
    expect(targetDetails("Pleasantly Relaxed").maxBAC).toBe(0.06);
    expect(targetDetails("Life Threatening")).toBeNull();
    expect(targetDetails(null)).toBeNull();
  });

  it("stamps ON PACE inside a pinned target range", () => {
    expect(stampFor(0.05, "Pleasantly Relaxed")).toBe("ON PACE");
  });

  it("stamps EASY NOW slightly above target and SLOW DOWN well above", () => {
    expect(stampFor(0.08, "Pleasantly Relaxed")).toBe("EASY NOW");
    expect(stampFor(0.12, "Pleasantly Relaxed")).toBe("SLOW DOWN");
  });

  it("grades unpinned nights on absolute thresholds", () => {
    expect(stampFor(0.03)).toBe("ON PACE");
    expect(stampFor(0.07)).toBe("EASY NOW");
    expect(stampFor(0.15)).toBe("SLOW DOWN");
  });

  it("stamps CUT OFF at high BAC regardless of target", () => {
    expect(stampFor(CUTOFF_BAC, "Definitely Tipsy")).toBe("CUT OFF");
    expect(stampFor(0.3)).toBe("CUT OFF");
  });

  it("returns null pour time at cutoff", () => {
    const person = { weight: 78, gender: "male" };
    expect(nextPourMinutes(0.3, person, { abv: 0.05, volume: 12 })).toBeNull();
  });

  it("asks for a wait when the next drink would overshoot the pinned vibe", () => {
    const person = { weight: 78, gender: "male" };
    const minutes = nextPourMinutes(0.06, person, { abv: 0.05, volume: 12 }, "Pleasantly Relaxed");
    expect(minutes).toBeGreaterThan(0);
  });

  it("allows an immediate pour when sober", () => {
    const person = { weight: 78, gender: "male" };
    expect(nextPourMinutes(0, person, { abv: 0.05, volume: 12 })).toBe(0);
  });
});
