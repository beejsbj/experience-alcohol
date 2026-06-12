// Gesture thresholds for the receipt pile. All velocities in px/ms.
export const THROW_DX = 90; // sideways displacement that commits a throw
export const THROW_VX = 0.55; // sideways flick velocity that commits a throw
export const TABLE_OVERSHOOT = 120; // px past the bottom that sails the paper to the table
export const FLING_VY = 0.5; // upward flick velocity at the bottom edge
export const PULL_DOWN_DY = 80; // pull-down displacement at the top edge
export const PULL_DOWN_VY = 0.6; // pull-down flick velocity at the top edge
export const MOMENTUM = 260; // ms of velocity projected into the settle position

/**
 * Decide what happens when the finger lets go of the top receipt.
 *
 * @param {object} s
 * @param {number} s.dx     horizontal drag displacement (px)
 * @param {number} s.dy     vertical drag displacement (px)
 * @param {number} s.vx     horizontal release velocity (px/ms)
 * @param {number} s.vy     vertical release velocity (px/ms)
 * @param {number} s.panY   vertical paper position before this drag (≤ 0)
 * @param {number} s.minPan lowest panY (viewport − paper height; 0 if paper fits)
 * @param {boolean} s.solo  only one person — sideways throws disabled
 * @returns {{action: "throw-left"|"throw-right"|"to-table-up"|"to-table-down"|"settle", panY?: number}}
 */
export function decideRelease({ dx, dy, vx, vy, panY, minPan, solo }) {
  if (!solo && (Math.abs(dx) > THROW_DX || Math.abs(vx) > THROW_VX)) {
    const sign = Math.abs(vx) > 0.05 ? vx : dx;
    return { action: sign > 0 ? "throw-right" : "throw-left" };
  }

  const projected = panY + dy + vy * MOMENTUM;

  if (projected < minPan - TABLE_OVERSHOOT || (panY <= minPan && vy < -FLING_VY)) {
    return { action: "to-table-up" };
  }

  if (panY === 0 && dy > 0 && (dy > PULL_DOWN_DY || vy > PULL_DOWN_VY)) {
    return { action: "to-table-down" };
  }

  return { action: "settle", panY: Math.max(minPan, Math.min(0, projected)) };
}
