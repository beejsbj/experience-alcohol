// Paper and table geometry — every irregularity is seeded, so a receipt tears
// the same way and a glass leaves the same ring on every render, forever.

import { scatterRand } from "./scatter";

/**
 * A clip-path polygon for a strip of thermal paper torn off the roll at both
 * ends. Teeth are irregular (width and depth both jitter) but fixed per seed.
 *
 * @param {string} seed
 * @param {object} [o]
 * @param {number} [o.teeth=34]  roughly how many teeth across the width
 * @param {number} [o.depth=7]   max tooth depth in px
 * @param {boolean} [o.top=true] tear the top edge too
 * @returns {string} CSS clip-path value
 */
export function tornEdge(seed, { teeth = 34, depth = 7, top = true } = {}) {
  const rand = scatterRand(`torn:${seed}`);
  const edge = () => {
    const pts = [];
    let x = 0;
    const step = 100 / teeth;
    while (x < 100) {
      pts.push({ x, d: rand() * depth * 0.35 });
      x += step * (0.35 + rand() * 0.45);
      if (x >= 100) break;
      pts.push({ x, d: depth * (0.55 + rand() * 0.45) });
      x += step * (0.35 + rand() * 0.45);
    }
    pts.push({ x: 100, d: rand() * depth * 0.35 });
    return pts;
  };

  const f = (n) => n.toFixed(2);
  const topPts = top
    ? edge().map((p) => `${f(p.x)}% ${f(depth - p.d)}px`)
    : ["0% 0px", "100% 0px"];
  const bottomPts = edge()
    .reverse()
    .map((p) => `${f(p.x)}% calc(100% - ${f(depth - p.d)}px)`);

  return `polygon(${[...topPts, ...bottomPts].join(", ")})`;
}

/**
 * Bars for a printed barcode. Deterministic per seed; widths are in modules.
 * @returns {{ bars: {x:number, w:number}[], width: number, digits: string }}
 */
export function barcode(seed, count = 38) {
  const rand = scatterRand(`barcode:${seed}`);
  const bars = [];
  let x = 0;
  for (let i = 0; i < count; i += 1) {
    const w = 1 + Math.floor(rand() * 3);
    bars.push({ x, w });
    x += w + 1 + Math.floor(rand() * 2);
  }
  let digits = "";
  for (let i = 0; i < 12; i += 1) digits += Math.floor(rand() * 10);
  return { bars, width: x, digits };
}

// Footprint of each glass on the wood, as a ring radius in px.
const FOOTPRINT = { beer: 34, wine: 23, cocktail: 26, shot: 17 };

/**
 * Where a glass was set down for a pour, and how wet the ring still is.
 * Placement is seeded by the event id; wetness falls off with age.
 */
export function ringFor(event, now) {
  const rand = scatterRand(`ring:${event.id}`);
  const ageMin = Math.max(0, (now - new Date(event.timestamp).getTime()) / 60000);
  const r = (FOOTPRINT[event.type] ?? 28) * (0.92 + rand() * 0.16);
  return {
    id: event.id,
    x: 4 + rand() * 92, // % of the table width
    y: 3 + rand() * 94, // % of the table height
    r,
    rot: rand() * 360,
    // A ring is rarely whole: the arc where the glass sat heaviest.
    gap: 40 + rand() * 120,
    pool: rand() * 360,
    wet: Math.max(0, 1 - ageMin / 25),
    ageMin,
  };
}
