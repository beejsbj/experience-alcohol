// What friends scribble on each other's receipts. Pure and seeded: the same
// seed always draws the same doodle the same way, in the same place.

import { scatterRand } from "./scatter";
import { isCustomDrink } from "./drinkIdentity";
import { calculateBACAtTime } from "./bac";

const TAU = Math.PI * 2;

// Each doodle is a list of strokes in a 40×40 box. A stroke is either
// { pts, smooth } (a pen line through points) or { dot: [x, y] }.
const circle = (cx, cy, r, turns = 1.08, start = -1.9, n = 22) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = start + (i / n) * TAU * turns;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
// Part of an ellipse, from angle a0 to a1.
const arc = (cx, cy, rx, ry, a0, a1, n = 12) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (i / n) * (a1 - a0);
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  });
const spiral = (cx, cy, r, turns, n = 30) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * TAU * turns;
    const rr = 0.5 + (i / n) * r;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
const heartPts = (cx, cy, s = 1, n = 30) =>
  Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * TAU;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [cx + x * 1.05 * s, cy - 1 - y * 1.05 * s];
  });
const face = (features) => [{ pts: circle(20, 20, 16), smooth: true }, ...features];

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

  // ── what's in the glass ─────────────────────────────────────────────
  pint: () => [
    { pts: [[12, 9], [11, 36], [29, 36], [28, 9]], smooth: false },
    { pts: [[9, 9], [11, 5], [15, 8], [19, 4], [23, 8], [27, 4], [31, 9]], smooth: true },
    { pts: circle(18, 22, 1.6), smooth: true },
    { pts: circle(23, 28, 1.2), smooth: true },
  ],
  mug: () => [
    { pts: [[10, 10], [10, 34], [28, 34], [28, 10]], smooth: false },
    { pts: arc(28, 22, 6, 6, -Math.PI / 2, Math.PI / 2, 10), smooth: true },
    { pts: [[8, 10], [12, 6], [17, 9], [22, 5], [27, 9], [30, 10]], smooth: true },
  ],
  can: () => [
    { pts: [[13, 6], [27, 6], [28, 9], [28, 33], [26, 36], [14, 36], [12, 33], [12, 9], [13, 6]], smooth: false },
    { pts: [[13, 9], [27, 9]], smooth: false },
    { pts: circle(20, 13, 2.4, 1, 0, 10), smooth: true },
  ],
  bottle: () => [
    { pts: [[16, 4], [24, 4], [24, 13], [28, 19], [28, 36], [12, 36], [12, 19], [16, 13], [16, 4]], smooth: false },
    { pts: [[12, 24], [28, 24]], smooth: false },
    { pts: [[12, 30], [28, 30]], smooth: false },
  ],
  wineglass: () => [
    { pts: [[10, 5], [10, 10], ...arc(20, 10, 10, 12, Math.PI, 0, 14), [30, 10], [30, 5]], smooth: true },
    { pts: [[20, 22], [20, 34]], smooth: false },
    { pts: [[12, 35], [28, 35]], smooth: false },
  ],
  martini: () => [
    { pts: [[6, 8], [34, 8], [20, 24], [6, 8]], smooth: false },
    { pts: [[20, 24], [20, 34]], smooth: false },
    { pts: [[12, 35], [28, 35]], smooth: false },
    { pts: circle(16, 16, 2.5), smooth: true },
    { pts: [[9, 10], [22, 19]], smooth: false },
  ],
  shotglass: () => [
    { pts: [[13, 14], [11, 34], [29, 34], [27, 14], [13, 14]], smooth: false },
    { pts: [[12, 30], [28, 30]], smooth: false },
    { pts: [[13, 20], [27, 20]], smooth: false },
  ],
  flame: () => [
    { pts: [[20, 4], [12, 16], [11, 26], [16, 36], [26, 36], [30, 24], [27, 16], [22, 20], [20, 4]], smooth: true },
    { pts: [[20, 22], [16, 28], [20, 34], [24, 28], [20, 22]], smooth: true },
  ],
  lemon: () => [
    { pts: arc(20, 20, 14, 9, 0, TAU, 24), smooth: true },
    { pts: [[33, 19], [37, 18]], smooth: false },
    { pts: [[7, 21], [3, 22]], smooth: false },
    { pts: [[12, 20], [28, 20]], smooth: false },
  ],
  lime: () => [
    { pts: [...arc(20, 22, 15, 15, 0, Math.PI, 16), [5, 22], [35, 22]], smooth: false },
    ...[0.25, 0.5, 0.75].map((f) => ({ pts: [[20, 22], [20 + Math.cos(Math.PI * f) * 15, 22 + Math.sin(Math.PI * f) * 15]], smooth: false })),
  ],
  olive: () => [
    { pts: arc(20, 22, 9, 7, 0, TAU, 20), smooth: true },
    { pts: circle(20, 22, 2, 1, 0, 8), smooth: true },
    { pts: [[6, 6], [20, 22]], smooth: false },
  ],
  cherry: () => [
    { pts: circle(14, 27, 6), smooth: true },
    { pts: circle(27, 29, 6), smooth: true },
    { pts: [[14, 21], [18, 8]], smooth: true },
    { pts: [[27, 23], [20, 8]], smooth: true },
  ],
  umbrella: () => [
    { pts: arc(20, 20, 16, 16, Math.PI, TAU, 16), smooth: true },
    { pts: [[4, 20], [8, 17], [12, 20], [16, 17], [20, 20], [24, 17], [28, 20], [32, 17], [36, 20]], smooth: true },
    { pts: [[20, 20], [20, 36], [23, 38], [26, 35]], smooth: true },
  ],
  straw: () => [
    { pts: [[13, 36], [13, 14], [20, 5]], smooth: false },
    { pts: [[17, 36], [17, 15], [23, 8]], smooth: false },
  ],
  grapes: () => [
    ...[[14, 16], [22, 14], [18, 22], [26, 22], [14, 28], [22, 30], [19, 36]].map(([x, y]) => ({ pts: circle(x, y, 4, 1.05, 0, 12), smooth: true })),
    { pts: [[20, 10], [22, 4]], smooth: false },
  ],
  drop: () => [
    { pts: [[20, 4], [11, 18], [10, 26], [14, 34], [26, 34], [30, 26], [29, 18], [20, 4]], smooth: true },
    { pts: [[15, 27], [16, 31]], smooth: false },
  ],
  halo: () => [{ pts: arc(20, 20, 15, 5, 0, TAU * 1.05, 26), smooth: true }],
  icecube: () => [
    { pts: [[8, 14], [8, 34], [28, 34], [28, 14], [8, 14]], smooth: false },
    { pts: [[8, 14], [14, 8], [34, 8], [28, 14]], smooth: false },
    { pts: [[28, 34], [34, 28], [34, 8]], smooth: false },
    { pts: [[12, 18], [12, 24]], smooth: false },
  ],
  coffee: () => [
    { pts: [[8, 16], [10, 34], [28, 34], [30, 16], [8, 16]], smooth: false },
    { pts: arc(30, 25, 5, 5, -Math.PI / 2, Math.PI / 2, 8), smooth: true },
    { pts: [[14, 12], [16, 8], [14, 4]], smooth: true },
    { pts: [[22, 12], [24, 8], [22, 4]], smooth: true },
  ],

  // ── the hour ────────────────────────────────────────────────────────
  moon: () => [
    { pts: [...circle(20, 20, 15, 0.7, 1.9, 16), [30, 29], [23, 33], [15.2, 34.2]], smooth: true },
  ],
  pizza: () => [
    { pts: [[20, 36], [6, 8], [34, 8], [20, 36]], smooth: false },
    { pts: [[6, 8], [20, 4], [34, 8]], smooth: true },
    { pts: circle(16, 14, 2), smooth: true },
    { pts: circle(24, 16, 2), smooth: true },
    { pts: circle(20, 24, 2), smooth: true },
  ],
  fries: () => [
    { pts: [[10, 20], [8, 36], [32, 36], [30, 20], [10, 20]], smooth: false },
    { pts: [[13, 20], [12, 6]], smooth: false },
    { pts: [[19, 20], [20, 4]], smooth: false },
    { pts: [[25, 20], [27, 7]], smooth: false },
    { pts: [[16, 20], [17, 9]], smooth: false },
  ],
  taxi: () => [
    { pts: [[4, 28], [4, 20], [10, 19], [14, 12], [26, 12], [30, 19], [36, 20], [36, 28], [4, 28]], smooth: false },
    { pts: circle(11, 29, 3.5), smooth: true },
    { pts: circle(29, 29, 3.5), smooth: true },
    { pts: [[16, 12], [16, 8], [24, 8], [24, 12]], smooth: false },
  ],
  bed: () => [
    { pts: [[4, 30], [4, 22], [36, 22], [36, 30]], smooth: false },
    { pts: [[6, 22], [6, 12]], smooth: false },
    { pts: [[8, 22], [8, 17], [18, 17], [18, 22]], smooth: false },
    { pts: [[4, 30], [4, 34]], smooth: false },
    { pts: [[36, 30], [36, 34]], smooth: false },
  ],
  clock: () => [
    { pts: circle(20, 20, 15), smooth: true },
    { pts: [[20, 20], [20, 10]], smooth: false },
    { pts: [[20, 20], [28, 24]], smooth: false },
    ...[[20, 6, 20, 8], [34, 20, 32, 20], [20, 34, 20, 32], [6, 20, 8, 20]].map(([a, b, c, d]) => ({ pts: [[a, b], [c, d]], smooth: false })),
  ],

  // ── the state you're in ─────────────────────────────────────────────
  face_neutral: () => face([
    { pts: [[14, 15], [14, 18]], smooth: false },
    { pts: [[26, 15], [26, 18]], smooth: false },
    { pts: [[13, 27], [27, 27]], smooth: false },
  ]),
  face_wink: () => face([
    { pts: [[11, 16], [17, 16]], smooth: false },
    { pts: [[26, 15], [26, 18]], smooth: false },
    { pts: [[11, 24], [16, 29], [24, 29], [29, 23]], smooth: true },
  ]),
  face_tongue: () => face([
    { pts: [[14, 15], [14, 18]], smooth: false },
    { pts: [[26, 15], [26, 18]], smooth: false },
    { pts: [[11, 23], [16, 29], [24, 29], [29, 22]], smooth: true },
    { pts: [[18, 28], [18, 34], [24, 34], [24, 27]], smooth: true },
  ]),
  face_dizzy: () => face([
    { pts: spiral(14, 16, 4, 1.8), smooth: true },
    { pts: spiral(26, 16, 4, 1.8), smooth: true },
    { pts: [[12, 27], [15, 25], [18, 28], [21, 25], [24, 28], [27, 26]], smooth: true },
  ]),
  face_x: () => face([
    { pts: [[11, 13], [17, 19]], smooth: false },
    { pts: [[17, 13], [11, 19]], smooth: false },
    { pts: [[23, 13], [29, 19]], smooth: false },
    { pts: [[29, 13], [23, 19]], smooth: false },
    { pts: [[13, 29], [20, 26], [27, 29]], smooth: true },
  ]),
  face_hearts: () => face([
    { pts: heartPts(14, 16, 0.26), smooth: true },
    { pts: heartPts(26, 16, 0.26), smooth: true },
    { pts: [[11, 24], [16, 29], [24, 29], [29, 23]], smooth: true },
  ]),
  parachute: () => [
    { pts: arc(20, 16, 15, 15, Math.PI, TAU, 14), smooth: true },
    { pts: [[5, 16], [12, 19], [20, 16], [28, 19], [35, 16]], smooth: true },
    { pts: [[5, 16], [20, 36]], smooth: false },
    { pts: [[20, 16], [20, 36]], smooth: false },
    { pts: [[35, 16], [20, 36]], smooth: false },
    { pts: circle(20, 36, 2.5, 1, 0, 8), smooth: true },
  ],
  anchor: () => [
    { pts: circle(20, 7, 3.5, 1, 0, 10), smooth: true },
    { pts: [[20, 10], [20, 36]], smooth: false },
    { pts: [[12, 15], [28, 15]], smooth: false },
    { pts: arc(20, 22, 13, 13, Math.PI * 0.15, Math.PI * 0.85, 12), smooth: true },
    { pts: [[6, 24], [7.6, 28], [11, 27]], smooth: false },
    { pts: [[34, 24], [32.4, 28], [29, 27]], smooth: false },
  ],
  tortoise: () => [
    { pts: arc(20, 24, 13, 13, Math.PI, TAU, 14), smooth: true },
    { pts: [[7, 24], [33, 24]], smooth: false },
    { pts: circle(36, 24, 3.5, 1, 0, 10), smooth: true },
    { pts: [[11, 26], [9, 32]], smooth: false },
    { pts: [[29, 26], [31, 32]], smooth: false },
    { pts: [[14, 18], [20, 13], [26, 18]], smooth: true },
  ],
  snail: () => [
    { pts: spiral(24, 22, 11, 2.2), smooth: true },
    { pts: [[24, 33], [8, 33], [5, 29], [6, 23]], smooth: true },
    { pts: [[6, 23], [3, 16]], smooth: false },
    { pts: [[6, 23], [9, 16]], smooth: false },
  ],
  rocket: () => [
    { pts: [[20, 2], [12, 14], [12, 30], [28, 30], [28, 14], [20, 2]], smooth: true },
    { pts: [[12, 24], [6, 34], [12, 30]], smooth: false },
    { pts: [[28, 24], [34, 34], [28, 30]], smooth: false },
    { pts: circle(20, 16, 3, 1, 0, 10), smooth: true },
    { pts: [[16, 30], [20, 38], [24, 30]], smooth: true },
  ],
  boomerang: () => [{ pts: [[6, 30], [10, 14], [20, 8], [30, 14], [34, 30], [28, 20], [20, 16], [12, 20], [6, 30]], smooth: true }],

  // ── counting ────────────────────────────────────────────────────────
  skull: () => [
    { pts: circle(20, 16, 13), smooth: true },
    { pts: circle(15, 15, 3.5, 1, 0, 10), smooth: true },
    { pts: circle(25, 15, 3.5, 1, 0, 10), smooth: true },
    { pts: [[20, 20], [18, 23], [22, 23], [20, 20]], smooth: false },
    { pts: [[12, 26], [12, 34], [28, 34], [28, 26]], smooth: false },
    { pts: [[16, 30], [16, 34]], smooth: false },
    { pts: [[20, 30], [20, 34]], smooth: false },
    { pts: [[24, 30], [24, 34]], smooth: false },
  ],
  dice: () => [
    { pts: [[6, 6], [34, 6], [34, 34], [6, 34], [6, 6]], smooth: false },
    ...[[12, 12], [28, 12], [20, 20], [12, 28], [28, 28]].map(([x, y]) => ({ pts: circle(x, y, 2, 1, 0, 8), smooth: true })),
  ],
  trophy: () => [
    { pts: [[10, 6], [30, 6], [28, 20], [20, 26], [12, 20], [10, 6]], smooth: false },
    { pts: [[10, 9], [4, 10], [6, 17], [12, 18]], smooth: true },
    { pts: [[30, 9], [36, 10], [34, 17], [28, 18]], smooth: true },
    { pts: [[20, 26], [20, 32]], smooth: false },
    { pts: [[12, 34], [28, 34]], smooth: false },
  ],
  hashtag: () => [
    { pts: [[12, 6], [9, 34]], smooth: false },
    { pts: [[26, 6], [23, 34]], smooth: false },
    { pts: [[6, 15], [34, 13]], smooth: false },
    { pts: [[5, 27], [33, 25]], smooth: false },
  ],
  ghost: () => [
    { pts: [[8, 36], [8, 16], [14, 6], [26, 6], [32, 16], [32, 36], [27, 31], [22, 36], [17, 31], [12, 36], [8, 36]], smooth: false },
    { pts: circle(15, 17, 2, 1, 0, 8), smooth: true },
    { pts: circle(25, 17, 2, 1, 0, 8), smooth: true },
  ],

  // ── decor, some of it after dark ────────────────────────────────────
  peace: () => [
    { pts: circle(20, 20, 15), smooth: true },
    { pts: [[20, 5], [20, 35]], smooth: false },
    { pts: [[20, 20], [9, 30]], smooth: false },
    { pts: [[20, 20], [31, 30]], smooth: false },
  ],
  sunglasses: () => [
    { pts: [[4, 16], [4, 24], [8, 28], [16, 28], [18, 24], [18, 16], [4, 16]], smooth: true },
    { pts: [[22, 16], [22, 24], [24, 28], [32, 28], [36, 24], [36, 16], [22, 16]], smooth: true },
    { pts: [[18, 18], [22, 18]], smooth: false },
    { pts: [[4, 17], [0, 14]], smooth: false },
    { pts: [[36, 17], [40, 14]], smooth: false },
  ],
  mustache: () => [
    { pts: [[20, 22], [14, 16], [6, 18], [3, 24], [10, 26], [16, 24], [20, 22]], smooth: true },
    { pts: [[20, 22], [26, 16], [34, 18], [37, 24], [30, 26], [24, 24], [20, 22]], smooth: true },
  ],
  kiss: () => [
    { pts: [[6, 20], [12, 14], [18, 18], [20, 16], [22, 18], [28, 14], [34, 20]], smooth: true },
    { pts: [[6, 20], [14, 30], [20, 32], [26, 30], [34, 20]], smooth: true },
    { pts: [[6, 20], [34, 20]], smooth: false },
  ],
  eggplant: () => [
    { pts: [[12, 36], [8, 28], [12, 18], [20, 10], [28, 8], [33, 12], [30, 20], [24, 30], [18, 37], [12, 36]], smooth: true },
    { pts: [[26, 8], [22, 4], [30, 3], [34, 6], [28, 8]], smooth: false },
    { pts: [[30, 6], [34, 2]], smooth: false },
  ],
  peach: () => [
    { pts: circle(20, 22, 14), smooth: true },
    { pts: [[20, 10], [18, 20], [20, 30]], smooth: true },
    { pts: [[20, 8], [26, 3], [31, 6], [24, 10]], smooth: true },
    { pts: [[20, 9], [20, 4]], smooth: false },
  ],
  finger: () => [
    { pts: [[12, 22], [12, 36], [28, 36], [28, 22]], smooth: false },
    { pts: [[12, 22], [16, 20], [20, 22], [24, 20], [28, 22]], smooth: true },
    { pts: [[17, 22], [17, 6], [23, 6], [23, 22]], smooth: false },
    { pts: [[28, 26], [33, 22], [30, 30]], smooth: true },
  ],
  horns: () => [
    { pts: [[10, 22], [5, 5], [16, 14]], smooth: true },
    { pts: [[30, 22], [35, 5], [24, 14]], smooth: true },
    { pts: [[12, 24], [20, 20], [28, 24]], smooth: true },
  ],
  balloon: () => [
    { pts: arc(20, 16, 11, 13, 0, TAU * 1.04, 24), smooth: true },
    { pts: [[18, 30], [20, 28], [22, 30]], smooth: false },
    { pts: [[20, 30], [18, 34], [21, 38]], smooth: true },
  ],
};

// Doodles that have nothing to do with the drink in hand: anyone, any time.
const DECOR_SHAPES = [
  "star", "heart", "smiley", "spiral", "sparkle", "bolt", "flower", "note", "sun", "crown", "bubbles", "squiggle",
  "cheers", "asterisk", "arrows", "peace", "sunglasses", "mustache", "kiss", "balloon", "ghost", "dice", "trophy",
  "boomerang", "tortoise", "snail", "face_wink", "face_hearts", "eggplant", "peach", "horns", "hashtag",
];
const DECOR_WORDS = [
  "xo", "<3", "!!", "ha!", "yay", "wooo", "cheers", "10/10", "hi :)", "lol", "yesss", "fuck yeah", "hell yeah",
  "legend", "cutie", "same", "big mood", "lmao", "heyyy", "ok wow", "slay", "xx", "nice.", "69", "bless", "sip sip",
  "iconic", "no notes", "ok go", "mwah",
];
const w = (s) => `word:${s}`;

// What goes next to a ledger line, by what the line says.
export const LEDGER_POOLS = {
  beer: ["pint", "mug", "can", "bottle", "cheers", w("ahh")],
  wine: ["wineglass", "grapes", "bubbles", "cheers", w("fancy")],
  cocktail: ["martini", "umbrella", "cherry", "olive", "lime", "straw", "icecube"],
  shot: ["shotglass", "flame", "lemon", "lime", w("oof"), w("shots!!")],
  water: ["drop", "halo", "icecube", w("H2O"), w("bless"), w("good")],
  house: ["star", "sparkle", w("fancy"), w("ooh"), w("what's in it")],
  third: [w("3!"), w("lol"), "hashtag"],
  fifth: [w("5!!"), "crown", "dice"],
  seventh: ["dice", w("lucky 7"), w("7?!")],
  tenth: ["skull", "trophy", w("10!!"), w("double digits")],
  many: ["skull", "ghost", w("rip"), w("why")],
  loose: ["face_tongue", "face_wink", "horns", w("ur drunk"), w("heyyy")],
  wasted: ["face_dizzy", "face_x", "skull", "finger", w("oh no"), w("rip")],
  late: ["moon", w("zzz"), "pizza", "fries", "bed", "taxi"],
  gap: [w("round 2"), w("back?"), "boomerang", "clock"],
  first: [w("go!"), "rocket", w("here we go")],
};

export const DOODLE_NAMES = [
  ...new Set([
    ...Object.keys(SHAPES),
    ...DECOR_WORDS.map(w),
    ...Object.values(LEDGER_POOLS).flat(),
    w("zzz"), w("hat trick"),
  ]),
];

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

const initialsOf = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 3)
    .toUpperCase();

/**
 * Which marks friends have left on one receipt so far. A couple are there
 * from the start; the rest pile up as the table drinks: doodle n appears once the table has poured enough, always
 * in the same slot, in the same friend's ink.
 *
 * The pool only reads facts that never change during a night (the name,
 * when the tab opened), which is what keeps a mark still once it's down.
 *
 * @param {string} personId
 * @param {number} tablePours  pours logged at the whole table
 * @param {string[]} inks      pens at the table other than this person's
 * @param {string} ownInk
 * @param {number} slots       how many places on the paper can take one
 * @param {{ name?: string, startHour?: number }} about
 */
export function friendMarks(personId, tablePours, inks, ownInk, slots, about = {}) {
  const rand = scatterRand(`marks:${personId}`);
  const order = Array.from({ length: slots }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const k = Math.floor(rand() * (i + 1));
    [order[i], order[k]] = [order[k], order[i]];
  }
  // never the same scribble twice on one receipt
  const initials = initialsOf(about.name);
  const h = about.startHour;
  const names = [
    ...DECOR_SHAPES,
    ...DECOR_WORDS.map(w),
    ...(h != null && (h >= 23 || h < 4) ? ["moon", w("zzz")] : []),
    ...(h != null && h >= 5 && h < 17 ? ["sun", "coffee"] : []),
  ];
  for (let i = names.length - 1; i > 0; i -= 1) {
    const k = Math.floor(rand() * (i + 1));
    [names[i], names[k]] = [names[k], names[i]];
  }
  const unique = [...new Set(names)];
  names.splice(0, names.length, ...unique);
  // a couple from the moment the paper's torn off, more as the table drinks
  const count = Math.min(slots, 2 + Math.floor(tablePours * 0.7));
  const pens = inks.length ? inks : [ownInk];
  // A dedicated later slot can add initials after introduction. Reserve it
  // even while blank; naming the guest must not reshuffle existing marks.
  const initialsIndex = slots > 2 ? slots - 1 : -1;
  return order.slice(0, count).flatMap((slot, n) => {
    if (n === initialsIndex && !initials) return [];
    const r = scatterRand(`mark:${personId}:${slot}`);
    return {
      slot,
      name: n === initialsIndex ? w(initials) : names[slot % names.length],
      ink: pens[Math.floor(r() * pens.length)],
      rot: (r() * 2 - 1) * 18,
      size: 22 + Math.round(r() * 12),
      n,
    };
  });
}

// ── Doodles down the ledger ───────────────────────────────────────────────
// Each line gets its own seeded chance of a small scribble beside the drink.
// A line's pool is built from that line alone — what it was, which pour it
// made, how far gone you were right after it, what time it was — so a mark
// never changes once it's been drawn, however long the ledger grows.

const DRINK_POOL = { beer: "beer", wine: "wine", cocktail: "cocktail", shot: "shot", water: "water" };
// Capture at the originating pour, before the event enters the grow-only log.
// Remote snapshots carry these facts unchanged rather than recomputing history.
export function ledgerContext(events, event, person, opts = {}) {
  const t = event.t ?? new Date(event.timestamp).getTime();
  const previous = events.filter((e) => (e.t ?? new Date(e.timestamp).getTime()) <= t);
  const last = previous.at(-1);
  const start = opts.startedAt == null ? null : new Date(opts.startedAt).getTime();
  const pens = opts.inks?.length ? opts.inks : [opts.ownInk ?? "var(--pen)"];
  const rand = scatterRand(`ledger-ink:${event.personId}:${event.id}`);
  return {
    index: previous.length,
    pours: previous.filter((e) => (e.abv ?? e.alcoholContent ?? 0) > 0).length + ((event.abv ?? event.alcoholContent ?? 0) > 0 ? 1 : 0),
    after: calculateBACAtTime([...previous, event], person, t + 1000),
    gap: last ? (t - (last.t ?? new Date(last.timestamp).getTime())) / 60000 : 0,
    first: !previous.length && start != null && t - start >= 0 && t - start < 10 * 60000,
    ink: pens[Math.floor(rand() * pens.length)],
  };
}

/**
 * @param {string} personId
 * @param {object[]} events   this person's ledger, oldest first ({ id, type, abv, volume, t|timestamp })
 * @param {object} person     retained for existing callers; context is frozen on events
 * @param {{ ownInk?: string }} opts
 * @returns {(null | { name, ink, rot, size })[]} one entry per event
 */
export function ledgerMarks(personId, events, person, opts = {}) {
  return events.map((e) => {
    const t = e.t ?? new Date(e.timestamp).getTime();
    const soft = !((e.abv ?? e.alcoholContent ?? 0) > 0);
    // Old events have no historical snapshot. Use event-only facts so late
    // merges, weight edits and roster changes cannot alter their marks.
    const context = e.ledgerContext ?? {};
    const pours = context.pours ?? 0;
    const rand = scatterRand(`ledger:${personId}:${e.id}`);
    const chance = Math.min(0.55, 0.38 + (context.index ?? 0) * 0.015);
    if (rand() > chance) return null;

    const pool = [];
    const custom = isCustomDrink(e);
    pool.push(...LEDGER_POOLS[soft ? "water" : custom ? "house" : DRINK_POOL[e.type] ?? "house"]);
    if (!soft) {
      if (pours === 3) pool.push(...LEDGER_POOLS.third, ...LEDGER_POOLS.third);
      else if (pours === 5) pool.push(...LEDGER_POOLS.fifth, ...LEDGER_POOLS.fifth);
      else if (pours === 7) pool.push(...LEDGER_POOLS.seventh, ...LEDGER_POOLS.seventh);
      else if (pours === 10) pool.push(...LEDGER_POOLS.tenth, ...LEDGER_POOLS.tenth);
      else if (pours > 10) pool.push(...LEDGER_POOLS.many);
      const after = context.after ?? 0;
      if (after >= 0.16) pool.push(...LEDGER_POOLS.wasted, ...LEDGER_POOLS.wasted);
      else if (after >= 0.1) pool.push(...LEDGER_POOLS.loose);
    }
    const hour = new Date(t).getHours();
    if (hour >= 1 && hour < 5) pool.push(...LEDGER_POOLS.late);
    if ((context.gap ?? 0) >= 45) pool.push(...LEDGER_POOLS.gap);
    if (context.first) pool.push(...LEDGER_POOLS.first);

    return {
      name: pool[Math.floor(rand() * pool.length)],
      ink: context.ink ?? opts.ownInk ?? "var(--pen)",
      rot: (rand() * 2 - 1) * 14,
      size: 15 + Math.round(rand() * 3),
    };
  });
}

// ── The one doodle that's allowed to change ───────────────────────────────
// Beside the feeling headline: a face for the level, or something about the
// shape of the night. Keyed on what it shows, so it's redrawn when that moves.

const STATE_FACE = {
  Sober: ["face_neutral"],
  "Barely Noticeable": ["face_neutral", "smiley"],
  "Pleasantly Relaxed": ["smiley", "face_wink"],
  "Definitely Tipsy": ["face_wink", "face_hearts"],
  "Inhibitions Gone": ["face_tongue", "face_hearts", "horns"],
  "Feeling Confident": ["face_tongue", "face_dizzy"],
  Overconfident: ["face_dizzy", "face_x"],
  "Memory Blanks": ["face_x", "skull"],
  "Danger Zone": ["face_x"],
  "Life Threatening": ["face_x"],
};

/**
 * @param {{ state: string, verdict?: string, pinned?: string|null, sinceLastMin?: number,
 *           lastType?: string, pours?: number }} ctx  bucketed by the caller
 * @param {string} seed
 */
export function stateMark(ctx, seed) {
  const since = ctx.sinceLastMin ?? Infinity;
  let names;
  let key;
  if (ctx.verdict === "CUT OFF") [names, key] = [["face_x"], "cutoff"];
  else if ((ctx.lastIsSoft ?? (ctx.lastType === "water" && !ctx.lastIsCustom)) && since < 12) [names, key] = [["halo", "drop"], "water"];
  else if (ctx.pinned && ctx.verdict === "ON PACE" && (ctx.pours ?? 0) >= 2) [names, key] = [["anchor", "tortoise"], "held"];
  else if (since >= 45 && (ctx.pours ?? 0) > 0 && ctx.state !== "Sober") [names, key] = [["parachute", "snail"], "down"];
  else [names, key] = [STATE_FACE[ctx.state] ?? ["face_neutral"], ctx.state];
  const rand = scatterRand(`state-mark:${seed}:${key}`);
  return { name: names[Math.floor(rand() * names.length)], key, rot: (rand() * 2 - 1) * 12 };
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
