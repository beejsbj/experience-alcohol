import { describe, it, expect } from "vitest";
import {
  calculateBACAtTime,
  calculateSingleDrinkBAC,
  calculateTimeUntilNextDrink,
  projectBAC,
} from "../src/utils/bac";

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

  it("suggests waiting when another drink would cross the safe limit", () => {
    const minutes = calculateTimeUntilNextDrink(0.07, 0.026);
    expect(minutes).toBeGreaterThan(0);
  });

  it("shows BAC dropping over time from the same drink", () => {
    const drinkTime = new Date("2026-03-08T00:00:00Z").getTime();
    const history = [
      {
        timestamp: new Date(drinkTime),
        alcoholContent: 0.05,
        volume: 12,
      },
    ];

    const early = calculateBACAtTime(history, { weight: 78, gender: "male" }, drinkTime);
    const later = calculateBACAtTime(
      history,
      { weight: 78, gender: "male" },
      drinkTime + 1000 * 60 * 60
    );

    expect(later).toBeLessThan(early);
  });

  it("does not count drinks that have not happened yet", () => {
    const drinkTime = new Date("2026-03-08T02:00:00Z").getTime();
    const history = [
      {
        timestamp: new Date(drinkTime),
        alcoholContent: 0.05,
        volume: 12,
      },
    ];

    const beforeDrink = calculateBACAtTime(
      history,
      { weight: 78, gender: "male" },
      drinkTime - 1000 * 60 * 15
    );

    expect(beforeDrink).toBe(0);
  });

  it("reads abv field as well as legacy alcoholContent", () => {
    const drinkTime = Date.now() - 10 * 60 * 1000;
    const history = [{ timestamp: new Date(drinkTime), abv: 0.05, volume: 12 }];
    const bac = calculateBACAtTime(history, { weight: 78, gender: "male" }, Date.now());
    expect(bac).toBeGreaterThan(0);
  });

  it("projects a declining forecast that reaches zero", () => {
    const now = Date.now();
    const history = [
      { timestamp: new Date(now - 30 * 60 * 1000), alcoholContent: 0.4, volume: 1.5 },
    ];
    const points = projectBAC(history, { weight: 78, gender: "male" }, {
      from: now,
      hours: 6,
      stepMinutes: 30,
    });
    expect(points[0].bac).toBeGreaterThan(0);
    expect(points.at(-1).bac).toBe(0);
    expect(points.length).toBeGreaterThan(2);
    expect(points.at(-1).time).toBeLessThanOrEqual(now + 6 * 60 * 60 * 1000);
  });
});
