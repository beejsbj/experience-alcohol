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
 * Calculate current BAC from drink history (array of {timestamp, alcoholContent, volume})
 */
export function calculateCurrentBAC(drinkHistory = [], person) {
  if (!drinkHistory.length) return 0;
  const now = Date.now();
  let total = 0;

  for (const drink of drinkHistory) {
    const hoursSince =
      (now - new Date(drink.timestamp).getTime()) / (1000 * 60 * 60);
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
 * Inverse Widmark – drinks needed to reach a target BAC.
 */
export function calculateDrinksForBAC(
  targetBAC,
  weight,
  gender,
  alcoholContent,
  volume
) {
  if (targetBAC <= 0.02) return 1; // Always at least one
  const adjustedTarget = targetBAC + BAC_CONSTANTS.METABOLIC_RATE; // metabolism over ~1h consumption
  const weightLbs = weight * 2.20462;
  const r = BAC_CONSTANTS.GENDER_CONSTANTS[gender];
  const pureAlcoholNeeded = (adjustedTarget * weightLbs * r) / 5.14; // fl-oz pure ethanol
  const drinks = pureAlcoholNeeded / (volume * alcoholContent);
  const weightAdjustment = weight >= 100 ? 0.9 : 1;
  return Math.max(1, Math.round(drinks * weightAdjustment));
}

/**
 * Drinks per hour required to offset metabolic elimination (maintenance mode)
 */
export function calculateMaintenanceDrinksPerHour(alcoholContent, volume) {
  const pureAlcoholPerDrink = volume * alcoholContent;
  const weightLbs = 70 * 2.20462; // reference 70 kg male
  const r = BAC_CONSTANTS.GENDER_CONSTANTS.male;
  const pureAlcoholNeeded =
    (BAC_CONSTANTS.METABOLIC_RATE * weightLbs * r) / 5.14;
  return pureAlcoholNeeded / pureAlcoholPerDrink;
}

/**
 * Minutes until next drink without exceeding limit / leaving maintenance window
 */
export function calculateTimeUntilNextDrink(
  currentBAC,
  targetBAC = null,
  nextDrinkBAC = 0
) {
  if (currentBAC === 0) return 0;
  if (targetBAC != null) {
    if (currentBAC < targetBAC) return 0;
    return Math.max(
      0,
      ((currentBAC - targetBAC) / BAC_CONSTANTS.METABOLIC_RATE) * 60
    );
  }
  if (currentBAC + nextDrinkBAC > BAC_CONSTANTS.SAFE_LIMIT) {
    return Math.ceil(
      ((currentBAC + nextDrinkBAC - BAC_CONSTANTS.SAFE_LIMIT) /
        BAC_CONSTANTS.METABOLIC_RATE) *
        60
    );
  }
  return 0;
}

// Back-compat aliases --------------------------------------------------------
export const drinksToReachBAC = calculateDrinksForBAC;

//-------------------------------------------------------------------------
// Pace / comparison helpers (used by UI but pure math)
//-------------------------------------------------------------------------

/**
 * Calculate relative drinking pace between a reference person and another.
 * Returns a float where 1 means same pace, >1 means target can drink faster.
 */
export function calculateRelativePace(referencePerson, person) {
  if (!referencePerson || !person) return 0;
  const r1 = BAC_CONSTANTS.GENDER_CONSTANTS[referencePerson.gender];
  const r2 = BAC_CONSTANTS.GENDER_CONSTANTS[person.gender];
  const weight1g = referencePerson.weight * 1000;
  const weight2g = person.weight * 1000;
  return (weight2g * r1) / (weight1g * r2);
}

export function calculateDrinksUntilExtra(referencePerson, person) {
  const pace = calculateRelativePace(referencePerson, person);
  if (!pace || pace <= 1) return null;
  const drinks = 1 / (pace - 1);
  return Math.max(1, Math.round(drinks));
}

export function calculateDrinksUntilSkip(referencePerson, person) {
  const pace = calculateRelativePace(referencePerson, person);
  if (!pace || pace >= 1) return null;
  const drinks = 1 / (1 - pace);
  return Math.max(1, Math.round(drinks));
}
