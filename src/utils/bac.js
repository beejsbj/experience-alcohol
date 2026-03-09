// Consolidated BAC calculation utilities – single source of truth
// All math functions previously scattered across utils/utils.js, utils/bacCalculator.js and stores.

import { BAC_CONSTANTS } from "../constants";

/**
 * Calculate BAC increase from a single drink using Widmark formula (no time component)
 * @param {number} weight       Weight in kg
 * @param {string} gender       'male' | 'female'
 * @param {number} alcoholContent   Drink ABV fraction (e.g. 0.05)
 * @param {number} volume       Volume in fluid ounces
 */
export function calculateSingleDrinkBAC(
  weight,
  gender,
  alcoholContent,
  volume
) {
  const r = BAC_CONSTANTS.GENDER_CONSTANTS[gender];
  const weightLbs = weight * 2.20462; // Widmark formula expects pounds
  const pureAlcoholOz = volume * alcoholContent; // fl-oz of pure ethanol
  return (pureAlcoholOz * 5.14) / (weightLbs * r);
}

/**
 * Calculate BAC from drink history at a given point in time.
 */
export function calculateBACAtTime(
  drinkHistory = [],
  person,
  targetTime = Date.now()
) {
  if (!drinkHistory.length) return 0;
  let total = 0;

  for (const drink of drinkHistory) {
    const drinkTime = new Date(drink.timestamp).getTime();
    if (drinkTime > targetTime) {
      continue;
    }

    const hoursSince = (targetTime - drinkTime) / (1000 * 60 * 60);
    const initial = calculateSingleDrinkBAC(
      person.weight,
      person.gender,
      drink.alcoholContent,
      drink.volume
    );
    const remaining = Math.max(
      0,
      initial - BAC_CONSTANTS.METABOLIC_RATE * hoursSince
    );
    total += remaining;
  }
  return total;
}

/**
 * Calculate current BAC from drink history (array of {timestamp, alcoholContent, volume})
 */
export function calculateCurrentBAC(drinkHistory = [], person) {
  return calculateBACAtTime(drinkHistory, person, Date.now());
}

/**
 * Minutes until next drink without exceeding limit / leaving maintenance window
 */
export function calculateTimeUntilNextDrink(
  currentBAC,
  nextDrinkBAC = 0,
  limitBAC = BAC_CONSTANTS.SAFE_LIMIT
) {
  if (currentBAC === 0) return 0;
  if (currentBAC + nextDrinkBAC > limitBAC) {
    return Math.ceil(
      ((currentBAC + nextDrinkBAC - limitBAC) /
        BAC_CONSTANTS.METABOLIC_RATE) *
        60
    );
  }
  return 0;
}
