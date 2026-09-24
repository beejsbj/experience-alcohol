// Feeling states, stamp verdicts, and pour timing — the maintain engine.

import { BAC_CONSTANTS, FEELING_STATES, MAINTAINABLE_STATES } from "../constants";
import { calculateSingleDrinkBAC, calculateTimeUntilNextDrink } from "./bac";

// Above this estimate the app stops giving pour timings entirely.
export const CUTOFF_BAC = 0.25;

export function feelingFor(bac) {
  return (
    [...FEELING_STATES].reverse().find((state) => bac >= state.minBAC) ||
    FEELING_STATES[0]
  );
}

export function targetDetails(stateName) {
  if (!stateName) return null;
  return MAINTAINABLE_STATES.find((state) => state.state === stateName) || null;
}

export function stampFor(bac, pinnedState = null) {
  if (bac >= CUTOFF_BAC) return "CUT OFF";

  const target = targetDetails(pinnedState);
  if (target) {
    if (bac <= target.maxBAC) return "ON PACE";
    if (bac < target.maxBAC + 0.03) return "EASY NOW";
    return "SLOW DOWN";
  }

  if (bac < 0.06) return "ON PACE";
  if (bac < 0.1) return "EASY NOW";
  return "SLOW DOWN";
}

/**
 * Minutes until `drink` can be poured without overshooting the pinned vibe
 * (or the default limit when nothing is pinned). Null means no more tonight.
 */
export function nextPourMinutes(bac, person, drink, pinnedState = null) {
  if (bac >= CUTOFF_BAC) return null;

  const nextDrinkBAC = calculateSingleDrinkBAC(
    person.weight,
    person.gender,
    drink.abv ?? drink.alcoholContent,
    drink.volume
  );
  const target = targetDetails(pinnedState);
  const limit = target ? target.maxBAC : BAC_CONSTANTS.SAFE_LIMIT;

  return calculateTimeUntilNextDrink(bac, nextDrinkBAC, limit);
}
