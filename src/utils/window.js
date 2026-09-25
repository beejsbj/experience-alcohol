// The rose window model: turns one person's pours into panes of glass.
//
// The window is a clock of the night, and it is always full of glass: half-hour
// wedges crossed by lead rings, one ring per feeling, evenly spaced. Unlit, the
// glass is dark. The night lights it: from the first pour to now, each wedge
// glows out as far as the BAC reached, in the colour of the last drink poured.

import { FEELING_STATES } from "../constants";
import { calculateBACAtTime, projectBAC } from "./bac";
import { scatterRand } from "./scatter";

export const WEDGE_MIN = 30;
const WEDGE_MS = WEDGE_MIN * 60000;
const MAX_SPAN_MS = 11.5 * 3600000; // one turn of the face, less a sliver

// Glass for each pour. Jewel tones: beer gold, wine ruby, cocktail violet,
// shot ice. Anything poured by hand is emerald.
export const GLASS = {
  beer: "#E7B84C",
  wine: "#B5222B",
  cocktail: "#7B3A8C",
  shot: "#BFEAF2",
  custom: "#1F8A66",
};

export const glassFor = (type) => GLASS[type] ?? GLASS.custom;

// Lead rings: where one feeling gives way to the next, up to "feeling
// confident". The window's edge (SCALE_MAX) is where "overconfident" begins.
export const LEAD_RINGS = FEELING_STATES.slice(1, 6).map((s) => s.minBAC);

export const SCALE_MAX = 0.16;

// BAC → radius, piecewise so every feeling gets an equal ring of the window.
const STOPS = [0, ...LEAD_RINGS, SCALE_MAX];
export const feelingScale = ({ inner, outer }) => (bac) => {
  const b = Math.min(SCALE_MAX, Math.max(0, bac));
  const step = (outer - inner) / (STOPS.length - 1);
  for (let i = 0; i < STOPS.length - 1; i += 1) {
    if (b <= STOPS[i + 1]) return inner + step * (i + (b - STOPS[i]) / (STOPS[i + 1] - STOPS[i]));
  }
  return outer;
};

// Every cell of the tracery, lit or not: [{ key, slot, ring, from, to, glass, shade }].
// Unlit glass keeps a fixed seeded colour so the window looks made, not empty.
const UNLIT = ["#E7B84C", "#B5222B", "#7B3A8C", "#3E5FEA", "#1F8A66", "#BFEAF2"];
export const traceryCells = () => {
  const cells = [];
  for (let slot = 0; slot < 24; slot += 1) {
    for (let ring = 0; ring < STOPS.length - 1; ring += 1) {
      const rand = scatterRand(`cell:${slot}:${ring}`);
      cells.push({
        key: `${slot}:${ring}`,
        slot,
        ring,
        from: STOPS[ring],
        to: STOPS[ring + 1],
        glass: UNLIT[Math.floor(rand() * UNLIT.length)],
        shade: 0.08 + rand() * 0.1,
      });
    }
  }
  return cells;
};

const floorTo = (t, ms) => Math.floor(t / ms) * ms;

export function windowModel(events, person, { now, forecastHours = 3 } = {}) {
  const pours = [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  if (!pours.length) {
    return { wedges: [], forecast: [], pours: [], start: now, bac: 0, glass: null };
  }

  const firstPour = new Date(pours[0].timestamp).getTime();
  const start = Math.max(floorTo(firstPour, WEDGE_MS), now - MAX_SPAN_MS);
  const wedges = [];
  let cursor = 0;

  for (let t0 = start; t0 < now; t0 += WEDGE_MS) {
    const t1 = Math.min(t0 + WEDGE_MS, now);
    while (cursor < pours.length && new Date(pours[cursor].timestamp).getTime() <= t1) cursor += 1;
    const last = pours[cursor - 1];
    if (!last) continue;
    // A wedge reaches as far as its highest moment: sample its edges, its
    // middle, and just after every pour inside it (BAC peaks right after one).
    const samples = [t0, (t0 + t1) / 2, t1];
    for (const p of pours) {
      const at = new Date(p.timestamp).getTime() + 1000;
      if (at > t0 && at < t1) samples.push(at);
    }
    const bac = Math.max(...samples.map((at) => calculateBACAtTime(pours, person, at)));
    if (bac <= 0) continue;
    const rand = scatterRand(`pane:${t0}`);
    wedges.push({
      id: t0,
      t0,
      t1,
      bac,
      glass: glassFor(last.type),
      // stained glass is never one flat colour
      shades: Array.from({ length: LEAD_RINGS.length + 1 }, () => 0.72 + rand() * 0.26),
    });
  }

  const bac = calculateBACAtTime(pours, person, now);
  const forecast =
    bac > 0
      ? projectBAC(pours, person, { from: now, hours: forecastHours, stepMinutes: WEDGE_MIN }).filter(
          (p) => p.time - start < MAX_SPAN_MS
        )
      : [];

  return {
    wedges,
    forecast,
    pours: pours.map((p) => ({ id: p.id, time: new Date(p.timestamp).getTime(), glass: glassFor(p.type) })),
    start,
    bac,
    glass: glassFor(pours.at(-1).type),
  };
}

// Split a wedge's reach into panes between lead rings: [[fromBAC, toBAC], ...]
export function paneBands(bac) {
  const edges = [0, ...LEAD_RINGS.filter((r) => r < bac), Math.min(bac, SCALE_MAX)];
  const bands = [];
  for (let i = 0; i < edges.length - 1; i += 1) bands.push([edges[i], edges[i + 1]]);
  return bands;
}

// The pinned vibe as a band of the window, snapped to the lead rings: from the
// ring where the feeling begins to the ring where the next one does.
export function haloRange(target) {
  if (!target) return null;
  const stops = [0, ...LEAD_RINGS, SCALE_MAX];
  const from = Math.min(target.minBAC, SCALE_MAX);
  const to = stops.find((s) => s > target.maxBAC + 1e-9) ?? SCALE_MAX;
  return { from, to };
}
