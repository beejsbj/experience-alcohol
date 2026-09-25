// What friends scribble on each other's receipts. Pure and seeded: the same
// seed always draws the same doodle the same way, in the same place.

import { scatterRand } from "./scatter";

const TAU = Math.PI * 2;

// Each doodle is a list of strokes in a 40×40 box. A stroke is either
// { pts, smooth } (a pen line through points) or { dot: [x, y] }.
const circle = (cx, cy, r, turns = 1.08, start = -1.9, n = 22) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = start + (i / n) * TAU * turns;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });

const SHAPES = {
  star: () => {
    const v = Array.from({ length: 5 }, (_, i) => {
      const a = -Math.PI / 2 + (i * TAU) / 5;
      return [20 + Math.cos(a) * 17, 21 + Math.sin(a) * 17];
    });
    return [{ pts: [v[0], v[2], v[4], v[1], v[3], v[0], v[2]], smooth: false }];
  },
  heart: () => [
    {
      pts: Array.from({ length: 30 }, (_, i) => {
        const t = (i / 29) * TAU;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        return [20 + x * 1.05, 19 - y * 1.05];
      }),
      smooth: true,
    },
  ],
  smiley: () => [
    { pts: circle(20, 20, 16), smooth: true },
    { pts: [[14, 15], [14, 18]], smooth: false },
    { pts: [[26, 15], [26, 18]], smooth: false },
    { pts: [[11, 23], [16, 29], [24, 29], [29, 22]], smooth: true },
  ],
  spiral: () => [
    {
      pts: Array.from({ length: 40 }, (_, i) => {
        const a = (i / 39) * TAU * 2.6;
        const r = 1 + (i / 39) * 16;
        return [20 + Math.cos(a) * r, 20 + Math.sin(a) * r];
      }),
      smooth: true,
    },
  ],
  sparkle: () => [
    { pts: [[20, 2], [21, 16], [20, 38]], smooth: true },
    { pts: [[3, 20], [18, 21], [37, 19]], smooth: true },
    { pts: [[10, 10], [15, 15]], smooth: false },
    { pts: [[30, 30], [26, 26]], smooth: false },
  ],
  bolt: () => [{ pts: [[24, 2], [10, 22], [22, 20], [14, 38], [32, 14], [20, 16], [26, 2]], smooth: false }],
  flower: () => [
    {
      pts: Array.from({ length: 60 }, (_, i) => {
        const t = (i / 59) * Math.PI;
        const r = 16 * Math.cos(5 * t);
        return [20 + r * Math.cos(t), 20 + r * Math.sin(t)];
      }),
      smooth: true,
    },
    { pts: circle(20, 20, 3), smooth: true },
  ],
  note: () => [
    { pts: circle(13, 31, 5, 1.1, 0, 14), smooth: true },
    { pts: [[18, 30], [18, 6]], smooth: false },
    { pts: [[18, 6], [26, 10], [30, 17], [27, 22]], smooth: true },
  ],
  sun: () => [
    { pts: circle(20, 20, 8), smooth: true },
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i * TAU) / 8;
      return { pts: [[20 + Math.cos(a) * 12, 20 + Math.sin(a) * 12], [20 + Math.cos(a) * 18, 20 + Math.sin(a) * 18]], smooth: false };
    }),
  ],
  crown: () => [{ pts: [[4, 30], [6, 10], [14, 22], [20, 6], [26, 22], [34, 10], [36, 30], [4, 31]], smooth: false }],
  bubbles: () => [
    { pts: circle(14, 26, 8), smooth: true },
    { pts: circle(28, 14, 5), smooth: true },
    { pts: circle(30, 32, 3), smooth: true },
  ],
  squiggle: () => [
    { pts: Array.from({ length: 24 }, (_, i) => [2 + i * 1.6, 20 + Math.sin(i * 0.9) * 7]), smooth: true },
  ],
  cheers: () => [
    { pts: [[4, 12], [16, 8], [18, 30], [10, 32], [4, 12]], smooth: false },
    { pts: [[36, 12], [24, 8], [22, 30], [30, 32], [36, 12]], smooth: false },
    { pts: [[20, 2], [20, 5]], smooth: false },
    { pts: [[13, 3], [15, 6]], smooth: false },
    { pts: [[27, 3], [25, 6]], smooth: false },
  ],
  asterisk: () => [
    { pts: [[20, 4], [20, 36]], smooth: false },
    { pts: [[6, 12], [34, 28]], smooth: false },
    { pts: [[6, 28], [34, 12]], smooth: false },
  ],
  arrows: () => [
    { pts: [[4, 30], [14, 22], [24, 26], [36, 10]], smooth: true },
    { pts: [[28, 10], [36, 10], [35, 18]], smooth: false },
  ],
};

// Handwritten ones, set in the pen face.
const WORDS = ["xo", "<3", "!!", "ha!", "yay", "wooo", "cheers", "10/10", "hi :)"];

export const DOODLE_NAMES = [...Object.keys(SHAPES), ...WORDS.map((w) => `word:${w}`)];

// Chaikin-ish smoothing via quadratic midpoints — the line a pen actually makes.
function toPath(points, smooth) {
  const p = points.map(([x, y]) => [+x.toFixed(1), +y.toFixed(1)]);
  if (!smooth || p.length < 3) return `M${p.map((q) => q.join(" ")).join(" L")}`;
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i += 1) {
    const mx = ((p[i][0] + p[i + 1][0]) / 2).toFixed(1);
    const my = ((p[i][1] + p[i + 1][1]) / 2).toFixed(1);
    d += ` Q${p[i][0]} ${p[i][1]} ${mx} ${my}`;
  }
  const last = p.at(-1);
  return `${d} L${last[0]} ${last[1]}`;
}

/**
 * Draw a doodle by name with a seeded tremor. Returns
 * { paths: string[] } for shapes or { word } for handwritten ones.
 */
export function drawDoodle(name, seed, tremor = 0.9) {
  if (name.startsWith("word:")) return { word: name.slice(5) };
  const make = SHAPES[name];
  if (!make) return { paths: [] };
  const rand = scatterRand(`doodle:${name}:${seed}`);
  const j = () => (rand() * 2 - 1) * tremor;
  return {
    paths: make().map((stroke) => toPath(stroke.pts.map(([x, y]) => [x + j(), y + j()]), stroke.smooth)),
  };
}

/**
 * Which marks friends have left on one receipt so far. A couple are there
 * from the start; the rest pile up as the table drinks: doodle n appears once the table has poured enough, always
 * in the same slot, in the same friend's ink.
 *
 * @param {string} personId
 * @param {number} tablePours  pours logged at the whole table
 * @param {string[]} inks      pens at the table other than this person's
 * @param {string} ownInk
 * @param {number} slots       how many places on the paper can take one
 */
export function friendMarks(personId, tablePours, inks, ownInk, slots) {
  const rand = scatterRand(`marks:${personId}`);
  const order = Array.from({ length: slots }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const k = Math.floor(rand() * (i + 1));
    [order[i], order[k]] = [order[k], order[i]];
  }
  // never the same scribble twice on one receipt
  const names = [...DOODLE_NAMES];
  for (let i = names.length - 1; i > 0; i -= 1) {
    const k = Math.floor(rand() * (i + 1));
    [names[i], names[k]] = [names[k], names[i]];
  }
  // a couple from the moment the paper's torn off, more as the table drinks
  const count = Math.min(slots, 2 + Math.floor(tablePours * 0.7));
  const pens = inks.length ? inks : [ownInk];
  return order.slice(0, count).map((slot, n) => {
    const r = scatterRand(`mark:${personId}:${slot}`);
    return {
      slot,
      name: names[slot % names.length],
      ink: pens[Math.floor(r() * pens.length)],
      rot: (r() * 2 - 1) * 18,
      size: 22 + Math.round(r() * 12),
      n,
    };
  });
}

// ── The line under how you're feeling ─────────────────────────────────────
// Neat when you're sober, loopier the further in you are.

export const UNDERLINES = ["swash", "double", "wave", "loops", "zigzag", "scribble"];

export function underlineStyle(seed, bac, nudge = 0) {
  const tier = bac < 0.03 ? ["swash", "double"] : bac < 0.07 ? ["swash", "wave", "double"] : bac < 0.1 ? ["wave", "loops"] : ["loops", "zigzag", "scribble"];
  const pick = Math.floor(scatterRand(`ul:${seed}`)() * tier.length);
  return tier[(pick + nudge) % tier.length];
}

export function underlinePath(style, seed, width = 236, wobble = 0) {
  const rand = scatterRand(`ul-path:${seed}:${style}`);
  const j = (n) => (rand() * 2 - 1) * n * (1 + wobble);
  const w = width - 8;
  const pts = [];
  switch (style) {
    case "double":
      return [
        toPath([[4, 5 + j(1)], [w * 0.5, 4 + j(1.2)], [w, 5 + j(1)]], true),
        toPath([[14, 10 + j(1)], [w * 0.55, 10 + j(1.2)], [w - 20, 11 + j(1)]], true),
      ];
    case "wave":
      for (let x = 4; x <= w; x += 7) pts.push([x, 8 + Math.sin(x / 9) * (3 + wobble * 2) + j(0.6)]);
      return [toPath(pts, true)];
    case "loops":
      for (let i = 0; i <= 90; i += 1) {
        const t = i / 90;
        const a = t * TAU * 7;
        pts.push([4 + t * (w - 8) + Math.cos(a) * 6, 8 + Math.sin(a) * (4 + wobble * 2)]);
      }
      return [toPath(pts, true)];
    case "zigzag":
      for (let x = 4, up = true; x <= w; x += 9, up = !up) pts.push([x + j(1), (up ? 3 : 13) + j(1.5)]);
      return [toPath(pts, false)];
    case "scribble":
      for (let i = 0; i < 7; i += 1) {
        pts.push([6 + j(4), 4 + i * 1.4 + j(1)]);
        pts.push([w - 6 + j(6), 6 + i * 1.4 + j(1)]);
      }
      return [toPath(pts, false)];
    default: {
      const y0 = 6 + rand() * 3;
      const y1 = 3 + rand() * 3;
      return [`M3 ${y0.toFixed(1)} C ${w * 0.25} ${(y1 - 2).toFixed(1)}, ${w * 0.62} ${(y1 + 1).toFixed(1)}, ${w} ${y1.toFixed(1)} C ${w * 0.72} ${(y1 + 3).toFixed(1)}, ${w * 0.34} ${(y0 + 4).toFixed(1)}, 30 ${(y0 + 6).toFixed(1)}`];
    }
  }
}

// ── Notes friends leave, depending on how the night's going ───────────────

const NOTES = {
  "ON PACE": ["look at you, pacing", "cheers to this one", "good night so far", "love this for you"],
  "EASY NOW": ["sip, don't gulp", "water round next?", "slow sips, friend", "pace yourself x"],
  "SLOW DOWN": ["hey. water. now.", "slow down, we love you", "next one's a water", "sit this round out?"],
  "CUT OFF": ["we're getting you home", "you're done — water + snacks", "taxi's on us", "no more. we've got you"],
};

export function friendNote(personId, verdict, friends) {
  const lines = NOTES[verdict] ?? NOTES["ON PACE"];
  const rand = scatterRand(`note:${personId}:${verdict}`);
  const text = lines[Math.floor(rand() * lines.length)];
  const from = friends.length ? friends[Math.floor(rand() * friends.length)] : null;
  return { text, from };
}
