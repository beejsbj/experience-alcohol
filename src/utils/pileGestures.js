// Gesture thresholds for the receipt pile. All velocities in px/ms.
export const THROW_DX = 90;   // horizontal displacement that commits a throw
export const THROW_VX = 0.55; // horizontal flick velocity that commits a throw
export const MOMENTUM = 260;  // ms of velocity projected into the settle position

/**
 * Decide what happens when the finger lets go of the top receipt.
 *
 * Only HORIZONTAL gestures flip the deck — a "qualifying throw" is either:
 *   Math.abs(dx) > THROW_DX   — wide horizontal displacement
 *   Math.abs(vx) > THROW_VX   — fast horizontal flick
 *
 * Vertical dragging is reserved entirely for scrolling/reading the paper
 * (settle clamps panY); it never flips, fast or slow.
 *
 * Pinch (two-pointer zoom-out) is handled in the component, not here.
 *
 * @param {object} s
 * @param {number}  s.dx      horizontal drag displacement (px)
 * @param {number}  s.dy      vertical drag displacement (px)
 * @param {number}  s.vx      horizontal release velocity (px/ms)
 * @param {number}  s.vy      vertical release velocity (px/ms)
 * @param {number}  s.panY    vertical paper position before this drag (≤ 0)
 * @param {number}  s.minPan  lowest panY (viewport − paper height; 0 if paper fits)
 * @param {boolean} s.solo    only one person — "next" is disabled
 * @returns {{ action: "next" } | { action: "settle", panY: number }}
 */
export function decideRelease({ dx, dy, vx, vy, panY, minPan, solo }) {
  const qualifies = Math.abs(dx) > THROW_DX || Math.abs(vx) > THROW_VX;

  if (!solo && qualifies) {
    return { action: "next" };
  }

  const settled = Math.max(minPan, Math.min(0, panY + dy + vy * MOMENTUM));
  return { action: "settle", panY: settled };
}
