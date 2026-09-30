import { describe, expect, it } from "vitest";
import { isSoft } from "../src/utils/bac";
import { nextPourMinutes } from "../src/utils/feelings";
import { pourCount, standardDrinks } from "../src/utils/receipt";
import { DRINKS } from "../src/constants";

const person = { weight: 78, gender: "male" };
const water = { type: "water", abv: 0, volume: 12 };
const beer = { type: "beer", abv: 0.05, volume: 12 };

describe("water and 0% drinks", () => {
  it("knows a soft drink from a pour", () => {
    expect(isSoft(water)).toBe(true);
    expect(isSoft({ type: "mocktail", alcoholContent: 0, volume: 8 })).toBe(true);
    expect(isSoft(beer)).toBe(false);
  });

  it("never makes water wait — over the held vibe or past cut-off", () => {
    expect(nextPourMinutes(0.09, person, water, "Pleasantly Relaxed")).toBe(0);
    expect(nextPourMinutes(0.3, person, water)).toBe(0);
    expect(nextPourMinutes(0.09, person, beer, "Pleasantly Relaxed")).toBeGreaterThan(0);
  });

  it("leaves water out of the pour count and standard drinks", () => {
    const events = [beer, water, beer, water];
    expect(pourCount(events)).toBe(2);
    expect(standardDrinks(events)).toBeCloseTo(standardDrinks([beer, beer]), 6);
  });

  it("puts water on the mat by default", () => {
    expect(DRINKS.find((d) => d.type === "water")?.abv).toBe(0);
  });
});
