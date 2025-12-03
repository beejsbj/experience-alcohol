import { describe, it, expect } from "vitest";
import {
  calculateSingleDrinkBAC,
  calculateDrinksForBAC,
} from "../src/utils/bac";
import { DRINK_TYPES } from "../src/constants";

describe("BAC utilities", () => {
  it("calculates BAC for a single beer", () => {
    const bac = calculateSingleDrinkBAC(78, "male", 0.05, 12);
    expect(bac).toBeCloseTo(0.026, 3);
  });

  it("calculates lower BAC for higher weight", () => {
    const low = calculateSingleDrinkBAC(70, "male", 0.05, 12);
    const high = calculateSingleDrinkBAC(90, "male", 0.05, 12);
    expect(high).toBeLessThan(low);
  });

  it("female BAC higher than male for same weight", () => {
    const male = calculateSingleDrinkBAC(70, "male", 0.05, 12);
    const female = calculateSingleDrinkBAC(70, "female", 0.05, 12);
    expect(female).toBeGreaterThan(male);
  });

  it("drinks needed to reach 0.08 for 78kg male", () => {
    const drinks = calculateDrinksForBAC(
      0.08,
      78,
      "male",
      DRINK_TYPES.beer.alcoholPercentage,
      DRINK_TYPES.beer.oz
    );
    expect(drinks).toBe(4);
  });
});
