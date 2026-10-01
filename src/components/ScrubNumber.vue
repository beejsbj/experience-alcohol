<script setup>
import { computed, ref } from "vue";
import { triggerHaptic } from "../utils/haptics";

// A number written in pen that you change by dragging it sideways — a tick
// under your thumb per step. No input box, no spinner, and it never moves
// what's around it: it keeps the width of its widest value.
// Swallows its own pointer events so the pile doesn't read the drag as a throw.
const props = defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  step: { type: Number, default: 1 },
  // how far the thumb travels for one step
  pxPerStep: { type: Number, default: 8 },
  label: { type: String, required: true },
});
const emit = defineEmits(["update:modelValue", "tap"]);

const el = ref(null);
const scrubbing = ref(false);
const hint = ref(false);
let drag = null;

const decimals = computed(() => (String(props.step).split(".")[1] ?? "").length);
const shown = computed(() => Number(props.modelValue.toFixed(decimals.value)));
// Room for the widest value it can take (e.g. "12.5"), so neighbours stay put.
const width = computed(() => {
  const digits = Math.max(String(Math.trunc(props.min)).length, String(Math.trunc(props.max)).length) + decimals.value;
  return `${digits * 0.62 + (decimals.value ? 0.3 : 0)}em`;
});

const set = (v) => {
  const snapped = Math.round(v / props.step) * props.step;
  const next = Number(Math.min(props.max, Math.max(props.min, snapped)).toFixed(decimals.value));
  if (next === props.modelValue) return;
  emit("update:modelValue", next);
  triggerHaptic("selection");
};

const down = (e) => {
  drag = { x0: e.clientX, from: props.modelValue, moved: false, id: e.pointerId };
  // This control owns the gesture from touch-down, including fast exits.
  try { el.value.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
};
const move = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x0;
  if (!drag.moved) {
    if (Math.abs(dx) < 4) return;
    drag.moved = true;
    scrubbing.value = true;
  }
  set(drag.from + Math.trunc(dx / props.pxPerStep) * props.step);
};
const up = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  if (drag && !drag.moved) {
    // a tap: show which way it goes, and let the parent offer more
    hint.value = true;
    setTimeout(() => (hint.value = false), 900);
    emit("tap");
  }
  try { el.value.releasePointerCapture(drag.id); } catch { /* already released */ }
  drag = null;
  scrubbing.value = false;
};

const cancel = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  drag.moved = true; // A cancelled gesture is never a tap.
  up(e);
};

const keyDown = (e) => {
  const steps = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 };
  if (e.key === "Home") set(props.min);
  else if (e.key === "End") set(props.max);
  else if (e.key in steps) set(props.modelValue + steps[e.key] * props.step);
  else if (e.key === "Enter" || e.key === " ") emit("tap");
  else return;
  e.preventDefault();
};
</script>

<template>
  <span
    ref="el"
    class="scrub relative inline-block touch-none select-none text-right"
    :class="{ 'is-scrubbing': scrubbing }"
    :style="{ minWidth: width }"
    role="slider"
    tabindex="0"
    :aria-label="label"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="shown"
    @keydown="keyDown"
    @pointerdown.stop="down"
    @pointermove.stop="move"
    @pointerup.stop="up"
    @pointercancel.stop="cancel"
    @click.stop
  >
    <span class="scrub-value inline-block">{{ shown }}</span>
    <!-- pen nudges either side while you drag (or just after a tap) -->
    <span class="scrub-nudge scrub-nudge--l" :class="{ on: scrubbing || hint }" aria-hidden="true">‹</span>
    <span class="scrub-nudge scrub-nudge--r" :class="{ on: scrubbing || hint }" aria-hidden="true">›</span>
  </span>
</template>

<style scoped>
.scrub {
  cursor: ew-resize;
}
.scrub:focus-visible {
  outline: 2px solid var(--pen);
  outline-offset: 3px;
  border-radius: 4px;
}
.scrub-value {
  transform-origin: 50% 70%;
  transition: transform 140ms cubic-bezier(0.2, 1.4, 0.4, 1);
}
.is-scrubbing .scrub-value {
  transform: scale(1.12) rotate(-2deg);
}
.scrub-nudge {
  position: absolute;
  top: 50%;
  font-size: 0.6em;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}
.scrub-nudge--l {
  right: 100%;
  transform: translate(2px, -50%);
}
.scrub-nudge--r {
  left: 100%;
  transform: translate(-2px, -50%);
}
.scrub-nudge.on {
  opacity: 0.6;
}
.scrub-nudge--l.on {
  transform: translate(-3px, -50%);
}
.scrub-nudge--r.on {
  transform: translate(3px, -50%);
}
</style>
