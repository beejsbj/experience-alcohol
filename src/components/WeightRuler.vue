<script setup>
import { computed, ref } from "vue";
import { triggerHaptic } from "../utils/haptics";

// A moving window of printed paper under a stationary pen mark.
// Stops the pile from treating the drag as a throw.
const props = defineProps({
  modelValue: { type: Number, required: true },
  min: { type: Number, default: 40 },
  max: { type: Number, default: 140 },
});
const emit = defineEmits(["update:modelValue"]);

const W = 300;
const PAD = 10;
const el = ref(null);
let drag = null;
const SPAN = 50;

const x = (v) => W / 2 + ((v - props.modelValue) / SPAN) * (W - PAD * 2);

const ticks = computed(() => {
  const out = [];
  for (let v = Math.max(props.min, Math.ceil(props.modelValue - SPAN / 2)); v <= Math.min(props.max, props.modelValue + SPAN / 2); v += 1) {
    const major = v % 10 === 0;
    const mid = !major && v % 5 === 0;
    out.push({ v, x: x(v), h: major ? 12 : mid ? 8 : 4, label: major ? String(v) : null });
  }
  return out;
});

const setWeight = (v) => {
  const next = Math.min(props.max, Math.max(props.min, Math.round(v)));
  if (next !== props.modelValue) {
    emit("update:modelValue", next);
    if (next % 5 === 0) triggerHaptic("selection");
  }
};

const keyDown = (e) => {
  const steps = {
    ArrowLeft: -1,
    ArrowDown: -1,
    ArrowRight: 1,
    ArrowUp: 1,
    PageDown: -10,
    PageUp: 10,
  };
  if (e.key === "Home") setWeight(props.min);
  else if (e.key === "End") setWeight(props.max);
  else if (e.key in steps) setWeight(props.modelValue + steps[e.key]);
  else return;
  e.preventDefault();
};

const down = (e) => {
  const box = el.value.getBoundingClientRect();
  drag = { id: e.pointerId, x: e.clientX, value: props.modelValue, pxPerKg: box.width * (W - PAD * 2) / W / SPAN };
  try {
    el.value.setPointerCapture(e.pointerId);
  } catch {
    // synthetic pointer — moves still arrive by bubbling
  }
};
const move = (e) => {
  if (drag && e.pointerId === drag.id) {
    setWeight(drag.value - (e.clientX - drag.x) / drag.pxPerKg);
  }
};
const up = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  try { el.value.releasePointerCapture(drag.id); } catch { /* already released */ }
  drag = null;
};
</script>

<template>
  <svg
    ref="el"
    :viewBox="`0 0 ${W} 44`"
    class="block w-full touch-none select-none"
    style="cursor: ew-resize"
    role="slider"
    tabindex="0"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="modelValue"
    aria-label="Weight in kilograms"
    @keydown="keyDown"
    @pointerdown.stop="down"
    @pointermove.stop="move"
    @pointerup.stop="up"
    @pointercancel.stop="up"
    @lostpointercapture="up"
  >
    <line :x1="PAD" :x2="W - PAD" y1="26" y2="26" stroke="var(--print)" stroke-width="1" />
    <g v-for="t in ticks" :key="t.v">
      <line :x1="t.x" :x2="t.x" :y1="26" :y2="26 - t.h" stroke="var(--print)" :stroke-width="t.label ? 1.1 : 0.7" />
      <text v-if="t.label" :x="t.x" y="39" text-anchor="middle" font-size="7.5" class="print" fill="var(--print-soft)">{{ t.label }}</text>
    </g>
    <!-- the pen mark stays centred while the paper slides beneath it -->
    <g :transform="`translate(${W / 2} 0)`">
      <path d="M-5 3 L0 12 L5 3" fill="none" stroke="var(--pen)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M0 13 L0 27" stroke="var(--pen)" stroke-width="1.6" stroke-linecap="round" />
    </g>
  </svg>
</template>

<style scoped>
svg:focus-visible {
  outline: 2px solid var(--pen);
  outline-offset: 3px;
}
</style>
