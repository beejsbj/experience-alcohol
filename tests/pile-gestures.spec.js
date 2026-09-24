import { describe, expect, it } from "vitest";
import { decideRelease, MOMENTUM, THROW_DX, THROW_VX } from "../src/utils/pileGestures";

const base = { dx: 0, dy: 0, vx: 0, vy: 0, panY: 0, minPan: -600, solo: false };

describe("decideRelease — new gesture model", () => {
  // ── Qualifying throws → "next" ──────────────────────────────────────────

  it("returns next on a wide leftward displacement", () => {
    expect(decideRelease({ ...base, dx: -(THROW_DX + 1) }).action).toBe("next");
  });

  it("returns next on a wide rightward displacement", () => {
    expect(decideRelease({ ...base, dx: THROW_DX + 1 }).action).toBe("next");
  });

  it("returns next on a fast horizontal flick (right)", () => {
    expect(decideRelease({ ...base, dx: 20, vx: THROW_VX + 0.1 }).action).toBe("next");
  });

  it("returns next on a fast horizontal flick (left)", () => {
    expect(decideRelease({ ...base, dx: -20, vx: -(THROW_VX + 0.1) }).action).toBe("next");
  });

  it("returns next even when dx is moderate but vx is qualifying", () => {
    expect(decideRelease({ ...base, dx: 30, vx: THROW_VX + 0.2 }).action).toBe("next");
  });

  // ── Vertical gestures never flip — they scroll/settle ───────────────────

  it("settles on a fast upward flick (vertical never flips)", () => {
    expect(decideRelease({ ...base, panY: -100, vy: -1.2 }).action).toBe("settle");
  });

  it("settles on a fast downward flick (vertical never flips)", () => {
    expect(decideRelease({ ...base, panY: -100, vy: 1.2 }).action).toBe("settle");
  });

  // ── Vertical displacement alone (reading-pan) → "settle" ────────────────

  it("settles on slow vertical drag upward (reading pan, no flick)", () => {
    const r = decideRelease({ ...base, panY: -100, dy: -60, vy: -0.1 });
    expect(r.action).toBe("settle");
  });

  it("settles on slow vertical drag downward (reading pan, no flick)", () => {
    const r = decideRelease({ ...base, panY: -200, dy: 80, vy: 0.1 });
    expect(r.action).toBe("settle");
  });

  it("does NOT flip on a large vertical displacement with low velocity", () => {
    // dy well above any old PULL_DOWN_DY but vy below THROW_VY — must settle
    const r = decideRelease({ ...base, panY: 0, dy: 120, vy: 0.1 });
    expect(r.action).toBe("settle");
  });

  // ── Solo — never "next" ─────────────────────────────────────────────────

  it("settles when solo even with a qualifying horizontal displacement", () => {
    const r = decideRelease({ ...base, dx: -(THROW_DX + 50), vx: -1.2, solo: true });
    expect(r.action).toBe("settle");
  });

  it("settles when solo even with a qualifying horizontal velocity", () => {
    const r = decideRelease({ ...base, dx: 10, vx: THROW_VX + 0.5, solo: true });
    expect(r.action).toBe("settle");
  });

  it("settles when solo even with a qualifying horizontal flick", () => {
    const r = decideRelease({ ...base, dx: -20, vx: -(THROW_VX + 0.3), solo: true });
    expect(r.action).toBe("settle");
  });

  // ── panY clamping in settle ─────────────────────────────────────────────

  it("clamps panY at minPan when momentum overshoots bottom", () => {
    const r = decideRelease({ ...base, panY: -550, dy: -100, vy: -0.1 });
    expect(r.action).toBe("settle");
    expect(r.panY).toBe(-600); // clamped to minPan
  });

  it("clamps panY at 0 when momentum overshoots top", () => {
    const r = decideRelease({ ...base, panY: -40, dy: 60, vy: 0.1 });
    expect(r.action).toBe("settle");
    expect(r.panY).toBe(0);
  });

  it("computes correct unclamped settle position mid-paper", () => {
    const panY = -100;
    const dy = -50;
    const vy = -0.2;
    const r = decideRelease({ ...base, panY, dy, vy });
    expect(r.action).toBe("settle");
    expect(r.panY).toBe(Math.max(-600, Math.min(0, panY + dy + vy * MOMENTUM)));
  });

  it("returns settle panY when exactly at threshold boundary (no throw)", () => {
    // dx exactly at THROW_DX (not above) — borderline, should settle
    const r = decideRelease({ ...base, dx: THROW_DX, vx: 0, vy: 0 });
    expect(r.action).toBe("settle");
  });

  // ── Exported constants sanity check ────────────────────────────────────

  it("exports THROW_DX = 90", () => expect(THROW_DX).toBe(90));
  it("exports THROW_VX = 0.55", () => expect(THROW_VX).toBe(0.55));
  it("exports MOMENTUM = 260", () => expect(MOMENTUM).toBe(260));
});
