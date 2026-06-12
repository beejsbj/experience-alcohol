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
  try {
    top.setPointerCapture(e.pointerId);
  } catch {
    // inactive pointer (synthetic events, some Safari cases) — drag still works via bubbling
  }
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
