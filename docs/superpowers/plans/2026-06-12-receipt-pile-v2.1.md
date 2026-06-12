# Receipt Pile v2.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the embla deck with a pointer-physics receipt pile (free 2D drag, sideways throw, up-fling/pull-down to table), turn captions into hand-drawn arrow annotations, and turn pour buttons into sticky-paper stickers.

**Architecture:** A pure `decideRelease` function in `src/utils/pileGestures.js` owns all gesture thresholds (unit-tested). `ReceiptPile.vue` manages a stack of absolutely-positioned receipt cards with imperative transforms (Vue only owns the v-for list). `InkArrow.vue` renders seeded hand-drawn SVG arrows for margin notes. Sticker styling replaces `.pour-tile` in CSS.

**Tech Stack:** Vue 3 script setup, Pinia, Tailwind 3, Vitest, pointer events (no gesture library — embla is REMOVED).

**Spec:** `docs/superpowers/specs/2026-06-12-receipt-pile-v2.1-addendum.md`

**Environment:** Every bun/vitest command MUST be prefixed with `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && ` (default node is v16 and breaks Vite). Working dir: `/Users/burooj/Projects/experience-alcohol`, branch `redesign/doodled-tab`.

---

## File structure

- Create: `src/utils/pileGestures.js` — pure release-decision logic + thresholds
- Create: `tests/pile-gestures.spec.js` — unit tests for the above
- Create: `src/components/ReceiptPile.vue` — the pile (replaces ReceiptDeck.vue, which is deleted)
- Create: `src/components/InkArrow.vue` — seeded hand-drawn arrow SVG
- Create: `src/components/ColorScribble.vue` — corner color-swatch scribble (logic moves out of IdentityLine)
- Modify: `src/components/PersonReceipt.vue` — unclamp height, arrow annotations, pinned-vibe sticker
- Modify: `src/components/IdentityLine.vue` — bare weight number + arrow labels, remove ink blots
- Modify: `src/components/RoughChart.vue` — amber target line + handwritten chart annotations
- Modify: `src/components/PourTiles.vue` — sticker buttons
- Modify: `src/components/TableView.vue` — scrap settle-in animation
- Modify: `src/App.vue` — swap ReceiptDeck → ReceiptPile
- Modify: `src/assets/main.css` — `.pile-card`, `.sticker*` (delete `.pour-tile*`), `@keyframes scrap-in`
- Delete: `src/components/ReceiptDeck.vue`; remove `embla-carousel-vue` dependency

---

### Task 1: `pileGestures.js` — release decision (TDD)

**Files:**
- Create: `src/utils/pileGestures.js`
- Test: `tests/pile-gestures.spec.js`

- [ ] **Step 1: Write the failing tests**

Create `tests/pile-gestures.spec.js` with exactly:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bunx vitest run tests/pile-gestures.spec.js`
Expected: FAIL — cannot resolve `../src/utils/pileGestures`

- [ ] **Step 3: Implement**

Create `src/utils/pileGestures.js` with exactly:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bunx vitest run`
Expected: ALL tests pass (26 existing + 10 new = 36)

- [ ] **Step 5: Commit**

```bash
git add src/utils/pileGestures.js tests/pile-gestures.spec.js
git commit -m "feat: pile gesture release decision (pure, tested)"
```

---

### Task 2: ReceiptPile component + app swap + embla removal

**Files:**
- Create: `src/components/ReceiptPile.vue`
- Modify: `src/components/PersonReceipt.vue:130-135` (root div — unclamp)
- Modify: `src/App.vue:7,40` (import + component swap)
- Modify: `src/assets/main.css` (add `.pile-card`)
- Delete: `src/components/ReceiptDeck.vue`

- [ ] **Step 1: Unclamp PersonReceipt**

In `src/components/PersonReceipt.vue` replace the root element opening (currently):

```html
  <div
    class="receipt-paper mx-auto w-full overflow-y-auto"
    style="max-height: calc(100dvh - 90px); max-width: 420px; animation: receipt-in 280ms ease-out both;"
    :style="{ ...paperStyle }"
  >
```

with (no scroll, no max-height — the pile moves the paper):

```html
  <div
    class="receipt-paper mx-auto w-full"
    style="max-width: 420px; animation: receipt-in 280ms ease-out both;"
    :style="{ ...paperStyle }"
  >
```

- [ ] **Step 2: Add `.pile-card` to `src/assets/main.css`**

Inside `@layer components`, after `.table-grain`, add:

```css
  .pile-card {
    position: absolute;
    left: 50%;
    top: 16px;
    width: min(100vw - 24px, 420px);
    margin-left: calc(min(100vw - 24px, 420px) / -2);
    will-change: transform;
    cursor: grab;
  }

  .pile-card:active {
    cursor: grabbing;
  }
```

- [ ] **Step 3: Create `src/components/ReceiptPile.vue`**

Exactly:

```vue
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useSessionStore } from "../stores/session";
import { scatter, scatterRand } from "../utils/scatter";
import { decideRelease } from "../utils/pileGestures";
import PersonReceipt from "./PersonReceipt.vue";

const emit = defineEmits(["table"]);
const store = useSessionStore();

const people = computed(() => store.activePeople);
const focusedIdx = computed(() => {
  const i = people.value.findIndex((p) => p.id === store.focusedPersonId);
  return i === -1 ? 0 : i;
});

const reduced =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const TOP_OFFSET = 16;
const BOTTOM_CHROME = 96;

const stackEl = ref(null);
const cardEls = ref({});

let panY = 0;
let minPan = 0;
let drag = null;
let animating = false;
let suppressClick = false;

function setCardEl(id, el) {
  if (el) cardEls.value[id] = el;
  else delete cardEls.value[id];
}

function depthOf(idx) {
  const n = people.value.length;
  return (idx - focusedIdx.value + n) % n;
}

function topCardEl() {
  const p = people.value[focusedIdx.value];
  return p ? cardEls.value[p.id] : null;
}

// Seeded hand-stacked transform per depth; depth 0 is the live paper.
function baseTransform(person, depth, py = 0) {
  if (depth === 0) return `translateY(${py}px)`;
  const d = Math.min(depth, 2);
  const rand = scatterRand(`pile:${person.id}`);
  const dx = ((rand() * 2 - 1) * 5).toFixed(1);
  const rot = ((rand() * 2 - 1) * 2.4).toFixed(2);
  return `translate(${dx}px, ${-13 * d}px) scale(${1 - 0.03 * d}) rotate(${rot}deg)`;
}

function applyStack(animated) {
  people.value.forEach((person, idx) => {
    const el = cardEls.value[person.id];
    if (!el) return;
    const depth = depthOf(idx);
    el.style.transition =
      animated && !reduced
        ? "transform 420ms cubic-bezier(.2,1.25,.4,1), opacity 280ms ease"
        : "none";
    el.style.zIndex = String(40 - depth);
    el.style.opacity = "1";
    el.style.transform = baseTransform(person, depth, depth === 0 ? panY : 0);
  });
}

function measure() {
  const el = topCardEl();
  if (!el) return;
  minPan = Math.min(0, window.innerHeight - TOP_OFFSET - BOTTOM_CHROME - el.offsetHeight);
}

// ── Pointer drag ──────────────────────────────────────────────────────────
function onPointerDown(e) {
  if (animating || drag) return;
  const top = topCardEl();
  if (!top || !top.contains(e.target)) return;
  measure();
  drag = {
    id: e.pointerId,
    x0: e.clientX,
    y0: e.clientY,
    lx: e.clientX,
    ly: e.clientY,
    t: performance.now(),
    vx: 0,
    vy: 0,
    dx: 0,
    dy: 0,
    moved: false,
  };
  top.setPointerCapture(e.pointerId);
  top.style.transition = "none";
}

function onPointerMove(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const now = performance.now();
  const dt = Math.max(1, now - drag.t);
  drag.vx = drag.vx * 0.4 + ((e.clientX - drag.lx) / dt) * 0.6;
  drag.vy = drag.vy * 0.4 + ((e.clientY - drag.ly) / dt) * 0.6;
  drag.lx = e.clientX;
  drag.ly = e.clientY;
  drag.t = now;
  drag.dx = e.clientX - drag.x0;
  drag.dy = e.clientY - drag.y0;
  if (!drag.moved && Math.hypot(drag.dx, drag.dy) < 6) return;
  drag.moved = true;
  const top = topCardEl();
  if (!top) return;
  let ny = panY + drag.dy;
  if (ny > 0) ny *= 0.55;
  if (ny < minPan) ny = minPan + (ny - minPan) * 0.55;
  const rot = Math.max(-14, Math.min(14, drag.dx * 0.05));
  top.style.transform = `translate(${drag.dx}px, ${ny.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
}

function onPointerUp(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  if (!d.moved) return;
  suppressClick = true;
  setTimeout(() => {
    suppressClick = false;
  }, 300);

  const result = decideRelease({
    dx: d.dx,
    dy: d.dy,
    vx: d.vx,
    vy: d.vy,
    panY,
    minPan,
    solo: people.value.length < 2,
  });

  if (result.action === "throw-left") return throwSideways(-1, d);
  if (result.action === "throw-right") return throwSideways(1, d);
  if (result.action === "to-table-up") return tossToTable(d);
  if (result.action === "to-table-down") return setDownToTable();
  panY = result.panY;
  applyStack(true);
}

function onPointerCancel(e) {
  if (!drag || e.pointerId !== drag.id) return;
  drag = null;
  applyStack(true);
}

// A real drag must not also fire the click it ends on (buttons, pins, inputs).
function onClickCapture(e) {
  if (!suppressClick) return;
  e.stopPropagation();
  e.preventDefault();
  suppressClick = false;
}

// ── Release outcomes ──────────────────────────────────────────────────────
function throwSideways(dir, d) {
  const n = people.value.length;
  const next = people.value[(focusedIdx.value + (dir === -1 ? 1 : n - 1)) % n];
  const top = topCardEl();
  animating = true;
  if (reduced || !top) {
    finishThrow(next, null);
    return;
  }
  const flyY = panY + d.dy + d.vy * 200;
  top.style.transition = "transform 440ms ease-out";
  top.style.transform = `translate(${dir * window.innerWidth * 1.3}px, ${flyY.toFixed(0)}px) rotate(${dir * 24}deg)`;
  window.setTimeout(() => finishThrow(next, top), 440);
}

function finishThrow(next, thrownEl) {
  panY = 0;
  store.setFocus(next.id);
  nextTick(() => {
    applyStack(false);
    if (thrownEl && !reduced) {
      thrownEl.style.opacity = "0";
      requestAnimationFrame(() => {
        thrownEl.style.transition = "opacity 280ms ease";
        thrownEl.style.opacity = "1";
      });
    }
    measure();
    animating = false;
  });
}

function tossToTable(d) {
  animating = true;
  const top = topCardEl();
  if (reduced || !top) {
    emit("table");
    return;
  }
  top.style.transition = "transform 380ms cubic-bezier(.3,.7,.4,1), opacity 380ms ease";
  top.style.transform = `translate(${(d.dx * 0.4).toFixed(0)}px, ${(panY + d.dy - window.innerHeight * 0.4).toFixed(0)}px) scale(0.32) rotate(${(d.vx * 30).toFixed(1)}deg)`;
  top.style.opacity = "0.25";
  window.setTimeout(() => emit("table"), 360);
}

function setDownToTable() {
  animating = true;
  if (reduced || !stackEl.value) {
    emit("table");
    return;
  }
  stackEl.value.style.transition = "transform 240ms ease-in";
  stackEl.value.style.transform = `translateY(${window.innerHeight}px) scale(0.95)`;
  window.setTimeout(() => emit("table"), 230);
}

// ── Focus changes from outside (dots, table pickup, person added) ─────────
watch(
  () => store.focusedPersonId,
  () => {
    if (animating || drag) return;
    panY = 0;
    nextTick(() => {
      applyStack(true);
      measure();
    });
  }
);

watch(
  () => people.value.length,
  () => {
    nextTick(() => {
      applyStack(false);
      measure();
    });
  }
);

function onResize() {
  measure();
}

onMounted(() => {
  applyStack(false);
  measure();
  window.addEventListener("resize", onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
});

// ── Bottom chrome ─────────────────────────────────────────────────────────
const nextPerson = computed(() => {
  if (people.value.length < 2) return null;
  return people.value[(focusedIdx.value + 1) % people.value.length];
});

const hintStyle = computed(() => scatter(`swipe-hint:${store.session.id}`, { r: 1.5, x: 3, y: 1 }));
const tableHintStyle = computed(() => scatter(`table-hint:${store.session.id}`, { r: 1, x: 2, y: 1 }));

function dotClick(person) {
  if (person.id !== store.focusedPersonId) store.setFocus(person.id);
}
</script>

<template>
  <div class="relative flex flex-col w-full overflow-hidden" style="height: 100dvh">
    <!-- The pile — receipts live here as absolutely-positioned papers -->
    <div
      ref="stackEl"
      class="relative flex-1 select-none"
      style="touch-action: none"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @click.capture="onClickCapture"
    >
      <div
        v-for="person in people"
        :key="person.id"
        :ref="(el) => setCardEl(person.id, el)"
        class="pile-card"
      >
        <PersonReceipt :person="person" :is-new="false" />
      </div>
    </div>

    <!-- Below-pile: page dots + swipe hint + table button -->
    <div
      class="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-2 pt-3 pb-4"
      style="z-index: 45; pointer-events: none"
    >
      <div v-if="people.length > 1" class="flex items-center gap-2" style="pointer-events: auto">
        <button
          v-for="p in people"
          :key="p.id"
          type="button"
          class="page-dot transition-all"
          :class="{ 'page-dot--active': p.id === store.focusedPersonId }"
          :aria-label="`Go to ${p.name || 'unnamed'}`"
          @click="dotClick(p)"
        />
      </div>

      <div class="flex items-center gap-4" style="pointer-events: auto">
        <span
          v-if="nextPerson"
          class="scribble text-xs"
          style="color: rgba(232, 163, 60, 0.7)"
          :style="hintStyle"
        >
          swipe for {{ nextPerson.name?.trim() || '???' }} →
        </span>
        <button
          type="button"
          class="scribble text-xs"
          style="color: rgba(232, 163, 60, 0.85)"
          :style="tableHintStyle"
          @click="emit('table')"
        >
          the table ↓
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 4: Swap into App.vue and delete the old deck**

In `src/App.vue` change line 7:

```js
import ReceiptPile from "./components/ReceiptPile.vue";
```

and in the template change:

```html
        <ReceiptPile v-if="view === 'deck'" @table="showTable" />
```

Then:

```bash
rm src/components/ReceiptDeck.vue
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun remove embla-carousel-vue
```

- [ ] **Step 5: Verify build + tests**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bunx vitest run && bunx vite build`
Expected: 36 tests pass; build succeeds with no embla import errors. Also run `grep -ri embla src/` — expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: receipt pile — free 2D drag, sideways throws, fling/pull to table"
```

---

### Task 3: InkArrow + margin-note annotations (receipt + identity)

**Files:**
- Create: `src/components/InkArrow.vue`
- Create: `src/components/ColorScribble.vue`
- Modify: `src/components/PersonReceipt.vue` (tally row, BAC line, stamp row, pinned area, mount ColorScribble)
- Modify: `src/components/IdentityLine.vue` (bare weight + labels, remove blots)

- [ ] **Step 1: Create `src/components/InkArrow.vue`**

Exactly:

```vue
<script setup>
import { computed } from "vue";
import { scatterRand } from "../utils/scatter";

const props = defineProps({
  seed: { type: String, required: true },
  dir: { type: String, default: "left" }, // arrowhead points left or right
  color: { type: String, default: "var(--pen)" },
  width: { type: Number, default: 34 },
  height: { type: Number, default: 20 },
});

const geo = computed(() => {
  const rand = scatterRand(`arrow:${props.seed}`);
  const j = (range) => (rand() * 2 - 1) * range;
  const w = props.width;
  const h = props.height;
  const tail = { x: w - 4 + j(2), y: h - 5 + j(2) };
  const head = { x: 6 + j(2), y: 6 + j(2) };
  const ctrl = { x: w / 2 + j(6), y: h + j(5) };
  const flip = props.dir === "right";
  const fx = (x) => (flip ? w - x : x);
  return {
    path: `M ${fx(tail.x).toFixed(1)} ${tail.y.toFixed(1)} Q ${fx(ctrl.x).toFixed(1)} ${ctrl.y.toFixed(1)} ${fx(head.x).toFixed(1)} ${head.y.toFixed(1)}`,
    a1: `M ${fx(head.x + 7 + j(1.5)).toFixed(1)} ${(head.y - 2 + j(1.5)).toFixed(1)} L ${fx(head.x).toFixed(1)} ${head.y.toFixed(1)}`,
    a2: `M ${fx(head.x + 4 + j(1.5)).toFixed(1)} ${(head.y + 7 + j(1.5)).toFixed(1)} L ${fx(head.x).toFixed(1)} ${head.y.toFixed(1)}`,
  };
});
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    aria-hidden="true"
    style="flex-shrink: 0; overflow: visible"
  >
    <path :d="geo.path" fill="none" :stroke="color" stroke-width="1.5" stroke-linecap="round" />
    <path :d="geo.a1" fill="none" :stroke="color" stroke-width="1.5" stroke-linecap="round" />
    <path :d="geo.a2" fill="none" :stroke="color" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>
```

- [ ] **Step 2: Create `src/components/ColorScribble.vue`**

Exactly:

```vue
<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { PERSON_COLORS } from "../constants";
import { scatter } from "../utils/scatter";

const props = defineProps({ person: { type: Object, required: true } });
const store = useSessionStore();
const expanded = ref(false);
const rootRef = ref(null);

const handleDocClick = (e) => {
  if (!rootRef.value?.contains(e.target)) expanded.value = false;
};
onMounted(() => document.addEventListener("click", handleDocClick));
onBeforeUnmount(() => document.removeEventListener("click", handleDocClick));

const setColor = (color) => {
  store.updatePerson(props.person.id, { color });
  expanded.value = false;
};
</script>

<template>
  <div
    ref="rootRef"
    class="absolute top-7 right-3 z-10 flex flex-col items-end gap-1"
    :style="scatter(`swatch:${person.id}`, { r: 8, x: 2, y: 2 })"
  >
    <button type="button" aria-label="Pick ink color" @click.stop="expanded = !expanded">
      <svg width="34" height="26" viewBox="0 0 34 26" aria-hidden="true">
        <path
          d="M3 21 Q8 4 11 14 Q13 22 16 8 Q18 1 21 13 Q23 20 26 9 Q28 3 31 15"
          fill="none"
          :stroke="person.color"
          stroke-width="4.5"
          stroke-linecap="round"
          opacity="0.85"
        />
      </svg>
    </button>
    <div v-if="expanded" class="flex flex-col gap-0.5">
      <button
        v-for="color in PERSON_COLORS"
        :key="color"
        type="button"
        :aria-label="`Set ink color ${color}`"
        @click.stop="setColor(color)"
      >
        <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true">
          <path
            d="M2 14 Q6 3 9 10 Q11 16 14 6 Q16 1 19 9 Q21 14 24 7"
            fill="none"
            :stroke="color"
            :stroke-width="color === person.color ? 5 : 3.5"
            stroke-linecap="round"
            opacity="0.9"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 3: Rework `src/components/IdentityLine.vue`**

Replace the entire file with:

```vue
<script setup>
import { ref } from "vue";
import { useSessionStore } from "../stores/session";
import { scatter } from "../utils/scatter";
import WriteOn from "./WriteOn.vue";
import InkArrow from "./InkArrow.vue";

const props = defineProps({
  person: { type: Object, required: true },
});

const store = useSessionStore();

const editingWeight = ref(false);
const weightInput = ref(null);

const lineStyle = scatter(`identity:${props.person.id}`, { r: 1.5, x: 5, y: 2 });

const toggleSex = () => {
  store.updatePerson(props.person.id, {
    gender: props.person.gender === "male" ? "female" : "male",
  });
};

const startWeightEdit = () => {
  editingWeight.value = true;
  setTimeout(() => weightInput.value?.focus(), 50);
};

const commitWeight = () => {
  editingWeight.value = false;
};

const updateWeight = (e) => {
  const v = Number(e.target.value);
  if (v > 20 && v < 300) store.updatePerson(props.person.id, { weight: v });
};

const updateName = (name) => {
  store.updatePerson(props.person.id, { name });
};

const canDeactivate = () => store.activePeople.length > 1;

const deactivate = () => {
  if (canDeactivate()) store.deactivatePerson(props.person.id);
};
</script>

<template>
  <div class="flex items-baseline flex-wrap gap-x-2 gap-y-1" :style="lineStyle">
    <!-- Name write-on -->
    <WriteOn
      :model-value="person.name"
      :seed="`name:${person.id}`"
      placeholder="who's this?"
      :color="person.color"
      class="text-xl font-bold"
      @update:model-value="updateName"
    />

    <!-- Weight: bare printed number, annotated by hand -->
    <span class="inline-flex items-baseline gap-0.5">
      <span v-if="!editingWeight" class="print text-sm cursor-pointer" @click="startWeightEdit">
        {{ person.weight }}
      </span>
      <input
        v-else
        ref="weightInput"
        type="number"
        :value="person.weight"
        min="30"
        max="250"
        class="print text-sm w-14 bg-transparent border-b border-[var(--pen)] outline-none"
        style="font-size: 14px"
        @change="updateWeight"
        @blur="commitWeight"
        @keydown.enter="commitWeight"
      />
      <InkArrow :seed="`weight:${person.id}`" :width="24" :height="14" />
      <span class="scribble text-xs" style="color: var(--pen)">weight, kg</span>
    </span>

    <!-- Sex toggle: bare glyph, annotated -->
    <span class="inline-flex items-baseline gap-0.5">
      <button
        type="button"
        class="scribble text-lg leading-none"
        style="color: var(--pen)"
        :style="scatter(`sex:${person.id}`, { r: 6, x: 1, y: 1 })"
        :aria-label="`Toggle sex — currently ${person.gender}`"
        @click="toggleSex"
      >{{ person.gender === 'male' ? '♂' : '♀' }}</button>
      <InkArrow :seed="`sex-arrow:${person.id}`" :width="18" :height="12" />
      <span class="scribble text-xs" style="color: var(--pen)">sex</span>
    </span>

    <!-- "left the bar" deactivate link -->
    <button
      v-if="canDeactivate()"
      type="button"
      class="scribble text-[10px] ml-auto"
      style="color: var(--redpen); opacity: 0.75"
      @click="deactivate"
    >
      left the bar
    </button>
  </div>
</template>
```

- [ ] **Step 4: Annotations in `src/components/PersonReceipt.vue`**

4a. Add imports after the `StampVerdict` import:

```js
import InkArrow from "./InkArrow.vue";
import ColorScribble from "./ColorScribble.vue";
```

4b. Mount the corner swatch — directly after the masthead `<p>` element add:

```html
      <ColorScribble :person="person" />
```

4c. Tally row — replace the whole "4. Drinks" block with:

```html
      <!-- 4. Drinks: bare tally, annotated by hand -->
      <div class="mt-3 flex items-center gap-1.5" :style="scatter(`tally-row:${person.id}`, { r: 1, x: 3, y: 1 })">
        <TallyStrokes :count="totalDrinks" :seed="`total:${person.id}`" />
        <span class="print text-sm font-bold">{{ totalDrinks }}</span>
        <InkArrow :seed="`drinks:${person.id}`" :width="30" :height="18" />
        <span class="scribble text-sm" style="color: var(--pen)">drinks</span>
      </div>
```

4d. BAC line — the trend label moves to the chart (Task 4). Replace the BAC `<p>` block with:

```html
        <p
          class="print mt-1 text-base font-bold"
          :style="{ transform: `translateX(${scatterRand('bac-dx:'+person.id)() * 4}px)` }"
        >
          {{ bac.toFixed(3) }}%
          <span class="text-[10px] font-normal" style="color: var(--faded)">est.</span>
        </p>
```

4e. Pour copy strings — in the script, replace the `pourCopy` computed with:

```js
const pourCopy = computed(() => {
  if (cutOff.value) return "no more tonight — water + a friend keeping watch";
  const minutes = nextPourMinutes(bac.value, props.person, DRINKS[0], props.person.pinnedState);
  if (minutes === null || minutes <= 0) return "next pour — whenever you like";
  const at = new Date(now.value + minutes * 60000);
  const hh = at.getHours().toString().padStart(2, "0");
  const mm = at.getMinutes().toString().padStart(2, "0");
  return `next pour — ~${hh}:${mm}`;
});
```

4f. Stamp row — printed copy becomes a pen annotation pointing at the stamp. Replace the "Stamp verdict + pour copy" block with:

```html
        <!-- Stamp verdict, annotated by hand -->
        <div class="mt-2 flex flex-wrap items-center gap-1.5" :style="scatter(`stamp:${person.id}`, { r: 1, x: 2, y: 1 })">
          <StampVerdict :verdict="stamp" />
          <InkArrow
            :seed="`pour:${person.id}`"
            :width="30"
            :height="18"
            :color="cutOff ? 'var(--redpen)' : 'var(--pen)'"
          />
          <span class="scribble text-sm" :style="{ color: cutOff ? 'var(--redpen)' : 'var(--pen)' }">
            {{ pourCopy }}
          </span>
        </div>
```

- [ ] **Step 5: Verify**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bunx vitest run && bunx vite build`
Expected: 36 tests pass, build clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: margin-note annotations — ink arrows, bare values, corner color scribble"
```

---

### Task 4: RoughChart handwritten annotations

**Files:**
- Modify: `src/components/RoughChart.vue`

- [ ] **Step 1: Compute annotation geometry**

In the `chart` computed of `src/components/RoughChart.vue`, after the `focusedNow` line, add:

```js
  const focusedSeries = series.find((s) => s.person.id === props.person.id) ?? null;
  let trend = null;
  if (focusedSeries && focusedSeries.future.length > 1) {
    const midIdx = Math.floor(focusedSeries.future.length / 2);
    const mid = focusedSeries.future[midIdx];
    trend = {
      label:
        mid.bac > focusedSeries.past.at(-1).bac + 0.0005 ? "climbing" : "drifting down",
      x: Math.min(toX(mid.time), WIDTH - 70),
      y: Math.min(toY(mid.bac) + 14, HEIGHT - 6),
    };
  }

  let hereArrow = null;
  if (focusedNow) {
    const tx = Math.min(focusedNow.x + 5, WIDTH - 55);
    const ty = Math.max(focusedNow.y - 7, 10);
    hereArrow = `M ${tx + 14} ${ty + 2} Q ${(tx + focusedNow.x) / 2} ${ty + 8} ${focusedNow.x + 2} ${focusedNow.y - 4}`;
  }
```

and extend the return object to:

```js
  return {
    rendered,
    targetY: target ? toY((target.minBAC + target.maxBAC) / 2) : null,
    ticks,
    focusedNow,
    trend,
    hereArrow,
  };
```

- [ ] **Step 2: Template — amber target + annotations**

2a. In the target line element, change `stroke="var(--redpen)"` to `stroke="var(--amber)"` and add a label right after the `<line>`:

```html
      <text
        v-if="chart.targetY !== null"
        :x="PAD.left + 2"
        :y="Math.max(chart.targetY - 4, 8)"
        font-family="'Caveat', cursive"
        font-size="9"
        fill="var(--amber)"
      >the vibe you're holding</text>
```

2b. After the existing "you are here" `<text>` element, add the arrow to the dot and the trend label:

```html
      <path
        v-if="chart.hereArrow"
        :d="chart.hereArrow"
        fill="none"
        stroke="var(--redpen)"
        stroke-width="1"
        stroke-linecap="round"
      />

      <text
        v-if="chart.trend"
        :x="chart.trend.x"
        :y="chart.trend.y"
        font-family="'Caveat', cursive"
        font-size="9.5"
        fill="var(--faded)"
      >{{ chart.trend.label }}</text>
```

- [ ] **Step 3: Verify + commit**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bunx vitest run && bunx vite build`
Expected: pass.

```bash
git add src/components/RoughChart.vue
git commit -m "feat: chart annotations — amber vibe line, here-arrow, trend label"
```

---

### Task 5: Sticker pour strips + pinned-vibe sticker

**Files:**
- Modify: `src/assets/main.css` (delete `.pour-tile*` rules, add `.sticker*`)
- Modify: `src/components/PourTiles.vue`
- Modify: `src/components/PersonReceipt.vue` (pinned area)

- [ ] **Step 1: CSS — replace pour-tile with sticker**

In `src/assets/main.css`, delete the `.pour-tile`, `.pour-tile:active`, `.pour-tile--ready`, `.pour-tile__sweep`, and `.pour-tile__label` rules entirely. In their place add:

```css
  .sticker {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 100%;
    aspect-ratio: 1;
    background: #fffef6;
    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.25));
    clip-path: polygon(
      2% 6%, 5% 0, 95% 2%, 99% 8%,
      98% 92%, 94% 100%, 6% 98%, 1% 93%
    );
    color: var(--greenink);
    transition: transform 120ms ease;
  }

  .sticker:active {
    transform: scale(0.92);
  }

  .sticker--drying {
    color: #9a9a92;
  }

  .sticker--strip {
    width: auto;
    aspect-ratio: auto;
    padding: 3px 14px 4px;
  }

  .sticker--ghost {
    background: transparent;
    filter: none;
    clip-path: none;
    border: 2px dashed var(--faded);
    color: var(--faded);
  }

  .sticker__hatch {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      115deg,
      rgba(60, 60, 55, 0.22) 0 2px,
      transparent 2px 5px
    );
    clip-path: inset(0 0 0 calc((1 - var(--cd, 0)) * 100%));
  }

  .sticker__label {
    font-family: "Space Mono", monospace;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.06em;
  }
```

(Note: `filter: drop-shadow` instead of `box-shadow` — box-shadow would be cut off by the clip-path; drop-shadow follows the torn outline.)

- [ ] **Step 2: PourTiles.vue — sticker markup**

2a. In the script, replace the `waitLabel` function with:

```js
const waitLabel = (drink) => {
  const m = waitFor(drink);
  if (m === null) return "WATER";
  if (m <= 0) return "POUR!";
  return "DRYING";
};

const timeLeft = (drink) => {
  const m = waitFor(drink);
  if (m === null || m <= 0) return "";
  return m < 60 ? `${Math.ceil(m)}m` : `${Math.ceil(m / 60)}h`;
};
```

2b. In the template, replace the per-drink button (the element with `class="pour-tile w-full"` and everything inside it up to and including its closing `</button>`) with — note the SVG icon block stays exactly as it is, only the wrapper changes:

```html
        <div class="w-full" :style="scatter(`stick:${person.id}:${drink.type}`, { r: 3, x: 1, y: 1 })">
          <button
            type="button"
            class="sticker w-full"
            :class="{ 'sticker--drying': !isReady(drink) && waitFor(drink) !== null && waitFor(drink) > 0 }"
            :style="{ '--cd': cdFraction(drink) }"
            :aria-label="`Log ${drink.type}`"
            @click="pour(drink)"
          >
            <div v-if="!isReady(drink) && waitFor(drink) !== null && waitFor(drink) > 0" class="sticker__hatch"></div>

            [KEEP THE EXISTING 28×28 DOODLED SVG ICON BLOCK HERE UNCHANGED]

            <span class="sticker__label">{{ waitLabel(drink) }}</span>
            <span v-if="timeLeft(drink)" class="print" style="font-size: 8px">{{ timeLeft(drink) }}</span>
          </button>
        </div>
```

(The `[KEEP …]` marker means: leave the `<svg width="28" …>…</svg>` with all the beer/wine/cocktail/shot/flask templates exactly where it was, inside the button.)

2c. Add the scatter import at the top of the script:

```js
import { scatter } from "../utils/scatter";
```

2d. Replace the "+ own" button with the ghost-sticker variant:

```html
        <button
          type="button"
          class="sticker sticker--ghost w-full"
          style="font-family: 'Caveat', cursive; font-size: 0.85rem"
          :class="{ 'border-[var(--pen)]': showCustomSlip }"
          aria-label="Add a custom drink"
          @click="showCustomSlip = !showCustomSlip"
        >
          + own
        </button>
```

- [ ] **Step 3: PersonReceipt.vue — pinned vibe is a pinned sticker**

Replace the pinned/unpinned toggle area (the `div` with `@click="toggleVibeMenu"` and its two `<template>` branches) with:

```html
          <div
            class="relative flex items-center gap-2 cursor-pointer"
            style="padding-top: 8px"
            :style="scatter(`pin-area:${person.id}`, { r: 1, x: 3, y: 1 })"
            @click="toggleVibeMenu"
          >
            <template v-if="target">
              <span class="sticker sticker--strip" :style="scatter(`pin-strip:${person.id}`, { r: 2, x: 2, y: 0 })">
                <span class="scribble text-base" style="color: var(--ink)">
                  hold {{ person.pinnedState.toLowerCase() }}{{ holdTime ? ` — next ~${holdTime}` : '' }}
                </span>
              </span>
              <span class="absolute" style="top: -2px; left: 38px; z-index: 2">
                <PushPin :animate="false" />
              </span>
            </template>
            <template v-else>
              <span class="scribble text-sm" style="color: var(--faded)">pin a vibe?</span>
            </template>
          </div>
```

- [ ] **Step 4: Verify + commit**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bunx vitest run && bunx vite build`
Expected: pass. Also `grep -r "pour-tile" src/` — expected: no matches.

```bash
git add -A
git commit -m "feat: sticker pour strips — torn edges, drying hatch, pinned-vibe sticker"
```

---

### Task 6: Table scrap settle-in + final sweep

**Files:**
- Modify: `src/assets/main.css` (keyframes)
- Modify: `src/components/TableView.vue`

- [ ] **Step 1: Add keyframes to `src/assets/main.css`** (next to the other `@keyframes`):

```css
@keyframes scrap-in {
  from {
    transform: translateY(-14px) rotate(3deg);
    opacity: 0;
  }
}
```

- [ ] **Step 2: Animate scraps in `src/components/TableView.vue`**

In the mini-receipt `v-for` element, extend the bound `:style` object by adding one property to the existing object literal (after `zIndex: index,`):

```js
          animation: `scrap-in 260ms ease-out ${index * 50}ms both`,
```

- [ ] **Step 3: Verify + commit**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bunx vitest run && bunx vite build`
Expected: pass.

```bash
git add -A
git commit -m "polish: table scraps settle in when the receipt lands"
```

---

### Task 7: Browser verification (orchestrator)

Not a subagent task. In the preview browser (375×812):

- [ ] Pile renders: top receipt + peeking edges behind, no scrollbars anywhere
- [ ] Drag follows pointer in both axes with rotation; release mid-drag springs back
- [ ] Sideways throw cycles person (dots update, store.focusedPersonId changes)
- [ ] Up-fling at bottom (or on a short receipt) → table view
- [ ] Pull-down at top → table view; "the table ↓" button still works
- [ ] Tap targets still work after a drag (no ghost clicks): pour sticker, pin menu, weight edit
- [ ] Arrow labels render: drinks, weight kg, sex, next pour, chart annotations, corner scribble
- [ ] Console: zero errors/warnings
- [ ] `bunx vitest run` green; commit any polish, push, deploy `bunx vercel deploy --prod --yes`
