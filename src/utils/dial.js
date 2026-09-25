// Geometry for the coaster dial: the rim is a clock of the night. Angle is
// wall-clock time (12 hours per turn, 12 o'clock at the top), radius is BAC.
// Everything here is pure so the drawing stays deterministic and testable.

import { scatterRand } from "./scatter";

const TAU = Math.PI * 2;
const HOUR_MS = 3600000;

// Angle in radians for a timestamp, 0 at 12 o'clock, clockwise.
export const angleAt = (time) => {
  const d = new Date(time);
  const hours = (d.getHours() % 12) + d.getMinutes() / 60 + d.getSeconds() / 3600;
  return (hours / 12) * TAU;
};

export const polar = (cx, cy, r, angle) => ({
  x: cx + r * Math.sin(angle),
  y: cy - r * Math.cos(angle),
});

// BAC → radius inside the dial band. Clamped so a big night still fits.
export const makeScale = ({ inner, outer, max = 0.14 }) => (bac) =>
  inner + (outer - inner) * Math.min(1, Math.max(0, bac / max));

const fmt = (n) => Number(n.toFixed(2));

// Closed area path between the band's inner edge and the BAC curve.
// `points` are [{ time, bac }] in time order, at most 12h apart end to end.
export function areaPath(points, { cx, cy, scale, inner }) {
  if (points.length < 2) return "";
  const outerPts = points.map((p) => polar(cx, cy, scale(p.bac), angleAt(p.time)));
  const first = polar(cx, cy, inner, angleAt(points[0].time));
  const last = polar(cx, cy, inner, angleAt(points.at(-1).time));
  const sweep = angleSpan(points[0].time, points.at(-1).time) > Math.PI ? 1 : 0;
  return [
    `M${fmt(first.x)} ${fmt(first.y)}`,
    ...outerPts.map((p) => `L${fmt(p.x)} ${fmt(p.y)}`),
    `L${fmt(last.x)} ${fmt(last.y)}`,
    `A${inner} ${inner} 0 ${sweep} 0 ${fmt(first.x)} ${fmt(first.y)}`,
    "Z",
  ].join(" ");
}

// Open polyline along the curve (for the forecast).
export function linePath(points, { cx, cy, scale }) {
  if (points.length < 2) return "";
  return points
    .map((p, i) => {
      const { x, y } = polar(cx, cy, scale(p.bac), angleAt(p.time));
      return `${i ? "L" : "M"}${fmt(x)} ${fmt(y)}`;
    })
    .join(" ");
}

// Clockwise angular distance from a to b, in radians, within one turn.
export const angleSpan = (a, b) => {
  const span = Math.min(Math.max(0, b - a), 12 * HOUR_MS - 1);
  return (span / (12 * HOUR_MS)) * TAU;
};

// Annulus sector between two radii and two times — the pinned-vibe band.
export function bandPath(fromTime, toTime, rIn, rOut, { cx, cy }) {
  const a0 = angleAt(fromTime);
  const span = angleSpan(fromTime, toTime);
  if (span <= 0) return "";
  const a1 = a0 + span;
  const large = span > Math.PI ? 1 : 0;
  const p0 = polar(cx, cy, rOut, a0);
  const p1 = polar(cx, cy, rOut, a1);
  const p2 = polar(cx, cy, rIn, a1);
  const p3 = polar(cx, cy, rIn, a0);
  return [
    `M${fmt(p0.x)} ${fmt(p0.y)}`,
    `A${rOut} ${rOut} 0 ${large} 1 ${fmt(p1.x)} ${fmt(p1.y)}`,
    `L${fmt(p2.x)} ${fmt(p2.y)}`,
    `A${rIn} ${rIn} 0 ${large} 0 ${fmt(p3.x)} ${fmt(p3.y)}`,
    "Z",
  ].join(" ");
}

// Where a glass was set down: seeded by the pour's id, so a ring never moves.
// Rings land in the coaster's middle field, overlapping like a real night.
export function ringSpot(eventId, { cx, cy, field }) {
  const rand = scatterRand(`ring:${eventId}`);
  const angle = rand() * TAU;
  const dist = Math.sqrt(rand()) * field;
  return {
    x: cx + dist * Math.sin(angle),
    y: cy - dist * Math.cos(angle),
    rotate: rand() * 360,
    // a ring is never a perfect circle: slight squash and a broken arc
    squash: 0.94 + rand() * 0.08,
    gap: 20 + rand() * 70,
  };
}

// Hour ticks around the rim for a 12-hour face.
export const hourTicks = () =>
  Array.from({ length: 12 }, (_, h) => ({ hour: h === 0 ? 12 : h, angle: (h / 12) * TAU }));

// The spandrel above a pointed gothic arch: the stone between the arch and the
// rim, for one petal of the window from angle a0 to a1. The arch springs from
// the petal's two mullions at rSpring and meets in a point at rOuter, midway.
export function archSpandrel(a0, a1, rSpring, rOuter, { cx, cy }) {
  const am = (a0 + a1) / 2;
  const rise = rOuter - rSpring;
  const p = (r, a) => {
    const { x, y } = polar(cx, cy, r, a);
    return `${fmt(x)} ${fmt(y)}`;
  };
  const edge = rOuter + 3; // tuck under the rim so no glass shows past it
  return [
    `M${p(rSpring, a0)}`,
    `C${p(rSpring + rise * 0.62, a0)} ${p(rOuter - rise * 0.2, am - (am - a0) * 0.42)} ${p(rOuter, am)}`,
    `C${p(rOuter - rise * 0.2, am + (a1 - am) * 0.42)} ${p(rSpring + rise * 0.62, a1)} ${p(rSpring, a1)}`,
    `L${p(edge, a1)}`,
    `A${edge} ${edge} 0 0 0 ${p(edge, a0)}`,
    "Z",
  ].join(" ");
}

// Rotation in degrees for a label set radially at `angle`, flipped on the
// lower half of the face so it never reads upside down.
export const uprightRotation = (angle) => {
  const deg = ((((angle * 180) / Math.PI) % 360) + 360) % 360;
  return deg > 90 && deg < 270 ? deg - 180 : deg;
};
