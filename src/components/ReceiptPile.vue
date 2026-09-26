<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useSessionStore } from "../stores/session";
import { scatterRand } from "../utils/scatter";
import { decideRelease } from "../utils/pileGestures";
import PersonReceipt from "./PersonReceipt.vue";
import PourMat from "./PourMat.vue";

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

// Room the bar mat takes at the bottom; the paper scrolls until it clears it.
const BOTTOM_CHROME = 132;

// Pinch threshold: if currentDist / startDist drops below this, go to table
const PINCH_SHRINK = 0.7;

const stackEl = ref(null);
const cardEls = ref({});

let panY = 0;
let minPan = 0;
let drag = null;
let animating = false;
let suppressClick = false;

// ── Multi-pointer tracking for pinch ──────────────────────────────────────
// Map from pointerId → {x, y}
const activePointers = new Map();
let pinch = null; // { startDist, committed } when 2 pointers are active

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
  minPan = Math.min(0, window.innerHeight - el.offsetTop - BOTTOM_CHROME - el.offsetHeight);
}

// ── Pointer drag ──────────────────────────────────────────────────────────
function onPointerDown(e) {
  // Always track the pointer for pinch detection
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size === 2 && !pinch) {
    // Entering a two-finger gesture — cancel any in-progress single-finger drag
    if (drag) {
      drag = null;
      const top = topCardEl();
      if (top) top.style.transition = "none";
      applyStack(false);
    }
    // Record starting distance for pinch
    const pts = [...activePointers.values()];
    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    pinch = { startDist: Math.hypot(dx, dy), committed: false };
    return;
  }

  // Single-pointer drag path
  if (animating || drag || activePointers.size !== 1) return;
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
  // Don't capture yet: a captured pointer retargets the click to the card,
  // and a plain tap on anything written on the paper would never land.
  top.style.transition = "none";
}

function onPointerMove(e) {
  // Update pointer position for pinch tracking
  if (activePointers.has(e.pointerId)) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  // Pinch gesture: 2 pointers active
  if (pinch && activePointers.size === 2 && !pinch.committed) {
    const pts = [...activePointers.values()];
    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    const currentDist = Math.hypot(dx, dy);
    const ratio = currentDist / pinch.startDist;

    // Visual feedback: slightly scale the top card
    const top = topCardEl();
    if (top && !animating) {
      const scale = Math.max(0.85, Math.min(1, ratio));
      top.style.transition = "none";
      top.style.transform = `scale(${scale.toFixed(3)})`;
    }

    // Commit pinch-to-table when sufficiently zoomed out
    if (ratio < PINCH_SHRINK) {
      pinch.committed = true;
      tossToTable({ dx: 0, dy: 0, vx: 0, vy: 0 });
    }
    return;
  }

  // Single-pointer drag path
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
  const top = topCardEl();
  if (!top) return;
  if (!drag.moved) {
    // It's a real drag now: hold on to the pointer even if it leaves the paper.
    try {
      top.setPointerCapture(e.pointerId);
    } catch {
      // inactive pointer (synthetic events, some Safari cases) — drag still works via bubbling
    }
    top.classList.add("is-lifted");
  }
  drag.moved = true;
  let ny = panY + drag.dy;
  if (ny > 0) ny *= 0.55;
  if (ny < minPan) ny = minPan + (ny - minPan) * 0.55;
  const rot = Math.max(-14, Math.min(14, drag.dx * 0.05));
  top.style.transform = `translate(${drag.dx}px, ${ny.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`;
}

function onPointerUp(e) {
  activePointers.delete(e.pointerId);

  // Clean up pinch state when fingers lift
  if (pinch && activePointers.size < 2) {
    pinch = null;
    if (!animating) applyStack(true);
    return;
  }

  // Single-pointer drag path
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  topCardEl()?.classList.remove("is-lifted");
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

  if (result.action === "next") return flipToNext(d);
  panY = result.panY;
  applyStack(true);
}

function onPointerCancel(e) {
  activePointers.delete(e.pointerId);

  if (pinch && activePointers.size < 2) {
    pinch = null;
    if (!animating) applyStack(true);
    return;
  }

  if (!drag || e.pointerId !== drag.id) return;
  drag = null;
  topCardEl()?.classList.remove("is-lifted");
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

/**
 * Fly the top card off along its release vector, then advance to the next
 * person in the pile (always forward, wrapping).
 */
function flipToNext(d) {
  const n = people.value.length;
  const nextPerson = people.value[(focusedIdx.value + 1) % n];
  const top = topCardEl();
  animating = true;

  if (reduced || !top) {
    finishThrow(nextPerson, null);
    return;
  }

  // Fly off along the release vector (dx/dy direction), scaled to leave the screen
  const speed = Math.hypot(d.vx, d.vy);
  // Normalise direction; fall back to a rightward exit if there's barely any movement
  const mag = Math.hypot(d.dx, d.dy) || 1;
  const nx = d.dx / mag;
  const ny = d.dy / mag;
  const flyDist = window.innerWidth * 1.4;
  const flyX = nx * flyDist;
  const flyY = ny * flyDist;
  const rot = Math.sign(d.dx || d.vx || 1) * (18 + Math.min(speed * 20, 12));

  top.style.transition = "transform 400ms ease-out, opacity 300ms ease";
  top.style.transform = `translate(${flyX.toFixed(0)}px, ${flyY.toFixed(0)}px) rotate(${rot.toFixed(1)}deg)`;
  top.style.opacity = "0.15";
  window.setTimeout(() => finishThrow(nextPerson, top), 400);
}

function finishThrow(next, thrownEl) {
  panY = 0;
  store.setFocus(next.id);
  nextTick(() => {
    if (reduced || !thrownEl) {
      applyStack(false);
      measure();
      animating = false;
      return;
    }
    // Park the thrown card at its new depth invisibly, then let the pile
    // shuffle up with the spring while it fades back in.
    const idx = people.value.findIndex((p) => cardEls.value[p.id] === thrownEl);
    if (idx !== -1) {
      thrownEl.style.transition = "none";
      thrownEl.style.transform = baseTransform(people.value[idx], depthOf(idx));
      thrownEl.style.opacity = "0";
      void thrownEl.offsetWidth;
    }
    applyStack(true);
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

// ── Chrome on the wood ────────────────────────────────────────────────────
const focusedPerson = computed(() => people.value[focusedIdx.value] ?? null);
const nextPerson = computed(() => {
  if (people.value.length < 2) return null;
  return people.value[(focusedIdx.value + 1) % people.value.length];
});
const nextName = computed(() => nextPerson.value?.name?.trim() || "the next one");
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
        <PersonReceipt :person="person" />
      </div>
    </div>

    <!-- Notes on the wood above the paper (under it, once it slides up) -->
    <div
      class="absolute inset-x-0 top-0 flex items-center justify-between px-5"
      style="z-index: 30; height: calc(46px + env(safe-area-inset-top)); padding-top: env(safe-area-inset-top)"
    >
      <button
        v-if="nextPerson"
        type="button"
        class="pen text-[21px]"
        style="color: var(--amber-soft); -webkit-text-stroke: 0; transform: rotate(-2deg)"
        @click="store.setFocus(nextPerson.id)"
      >
        flick for {{ nextName }} →
      </button>
      <span v-else></span>
      <button
        type="button"
        class="pen text-[21px]"
        style="color: var(--amber-soft); -webkit-text-stroke: 0; transform: rotate(1.5deg)"
        @click="emit('table')"
      >
        pinch for the table ⤡
      </button>
    </div>

    <!-- The bar mat: glasses to pour for whoever's on top -->
    <PourMat v-if="focusedPerson && !focusedPerson.needsIntro" :key="focusedPerson.id" :person="focusedPerson" />
  </div>
</template>
