// Printed facts for the receipt — pure, so the paper and the tests agree.

import { calculateBACAtTime } from "./bac";
import { scatterRand } from "./scatter";

// One US standard drink is 0.6 fl oz of pure alcohol.
const STANDARD_OZ = 0.6;

export function standardDrinks(events) {
  const oz = events.reduce((sum, e) => sum + (e.abv ?? e.alcoholContent ?? 0) * e.volume, 0);
  return oz / STANDARD_OZ;
}

/** Highest estimate of the night so far; BAC peaks just after each pour. */
export function peakBAC(events, person, now = Date.now()) {
  let peak = calculateBACAtTime(events, person, now);
  for (const e of events) {
    const t = new Date(e.timestamp).getTime() + 1000;
    if (t <= now) peak = Math.max(peak, calculateBACAtTime(events, person, t));
  }
  return peak;
}

/** The bar's own numbering for a night: a table and a tab number. */
export function tabNumbers(sessionId) {
  const rand = scatterRand(`tab:${sessionId}`);
  return {
    table: String(1 + Math.floor(rand() * 18)).padStart(2, "0"),
    tab: String(100 + Math.floor(rand() * 9800)).padStart(4, "0"),
  };
}

export function clock(t) {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
