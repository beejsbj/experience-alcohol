import { describe, expect, it } from "vitest";
import { decideRelease, MOMENTUM } from "../src/utils/pileGestures";

const base = { dx: 0, dy: 0, vx: 0, vy: 0, panY: 0, minPan: -600, solo: false };

describe("decideRelease", () => {
  it("throws left on a long leftward drag", () => {
    expect(decideRelease({ ...base, dx: -120 }).action).toBe("throw-left");
  });

  it("throws right on a fast rightward flick even with small dx", () => {
    expect(decideRelease({ ...base, dx: 30, vx: 0.9 }).action).toBe("throw-right");
  });

  it("velocity direction wins over displacement direction", () => {
    expect(decideRelease({ ...base, dx: 20, vx: -0.8 }).action).toBe("throw-left");
  });

  it("settles instead of throwing when solo", () => {
    const r = decideRelease({ ...base, dx: -200, vx: -1.2, solo: true });
    expect(r.action).toBe("settle");
  });

  it("tosses to table on a hard up-fling that overshoots the bottom", () => {
    const r = decideRelease({ ...base, panY: -500, dy: -80, vy: -0.8 });
    expect(r.action).toBe("to-table-up");
  });

  it("tosses to table on any decent up-fling when paper fits the screen", () => {
    const r = decideRelease({ ...base, minPan: 0, dy: -40, vy: -0.6 });
    expect(r.action).toBe("to-table-up");
  });

  it("scrolls (settles) on a gentle up-flick mid-paper", () => {
    const r = decideRelease({ ...base, panY: -100, dy: -60, vy: -0.2 });
    expect(r.action).toBe("settle");
    expect(r.panY).toBe(Math.max(-600, -100 - 60 - 0.2 * MOMENTUM));
  });

  it("sets down to table on a pull-down past the top", () => {
    expect(decideRelease({ ...base, panY: 0, dy: 100 }).action).toBe("to-table-down");
    expect(decideRelease({ ...base, panY: 0, dy: 30, vy: 0.8 }).action).toBe("to-table-down");
  });

  it("does not fire pull-down when scrolled into the paper", () => {
    const r = decideRelease({ ...base, panY: -200, dy: 100 });
    expect(r.action).toBe("settle");
    expect(r.panY).toBe(-100);
  });

  it("clamps momentum settle to [minPan, 0]", () => {
    const up = decideRelease({ ...base, panY: -550, dy: -100, vy: -0.1 });
    expect(up.action).toBe("settle");
    expect(up.panY).toBe(-600);
    const down = decideRelease({ ...base, panY: -40, dy: 60, vy: 0.1 });
    expect(down.panY).toBe(0);
  });
});
