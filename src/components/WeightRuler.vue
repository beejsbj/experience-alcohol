<script setup>
import { computed, ref } from "vue";
import { triggerHaptic } from "../utils/haptics";

// A printed ruler along the paper; drag the pen mark to your weight.
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
let dragging = false;

const x = (v) => PAD + ((v - props.min) / (props.max - props.min)) * (W - PAD * 2);

const ticks = computed(() => {
  const out = [];
  for (let v = props.min; v <= props.max; v += 1) {
    const major = v % 10 === 0;
    const mid = !major && v % 5 === 0;
    out.push({ v, x: x(v), h: major ? 12 : mid ? 8 : 4, label: major ? String(v) : null });
  }
  return out;
});

const setFrom = (clientX) => {
  const box = el.value.getBoundingClientRect();
  const frac = (clientX - box.left) / box.width;
  const v = Math.round(props.min + frac * (props.max - props.min));
  const next = Math.min(props.max, Math.max(props.min, v));
  if (next !== props.modelValue) {
    emit("update:modelValue", next);
    if (next % 5 === 0) triggerHaptic("selection");
  }
};

const down = (e) => {
  dragging = true;
  try {
    el.value.setPointerCapture(e.pointerId);
  } catch {
    // synthetic pointer — moves still arrive by bubbling
  }
  setFrom(e.clientX);
};
const move = (e) => {
  if (dragging) setFrom(e.clientX);
};
const up = () => {
  dragging = false;
};
</script>

<template>
  <svg
    ref="el"
    :viewBox="`0 0 ${W} 44`"
    class="block w-full touch-none select-none"
    style="cursor: ew-resize"
    role="slider"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="modelValue"
    aria-label="Weight in kilograms"
    @pointerdown.stop="down"
    @pointermove.stop="move"
    @pointerup.stop="up"
    @pointercancel.stop="up"
  >
    <line :x1="PAD" :x2="W - PAD" y1="26" y2="26" stroke="var(--print)" stroke-width="1" />
    <g v-for="t in ticks" :key="t.v">
      <line :x1="t.x" :x2="t.x" :y1="26" :y2="26 - t.h" stroke="var(--print)" :stroke-width="t.label ? 1.1 : 0.7" />
      <text v-if="t.label" :x="t.x" y="39" text-anchor="middle" font-size="7.5" class="print" fill="var(--print-soft)">{{ t.label }}</text>
    </g>
    <!-- the pen mark, dragged along the scale -->
    <g :transform="`translate(${x(modelValue)} 0)`" style="transition: transform 60ms linear">
      <path d="M-5 3 L0 12 L5 3" fill="none" stroke="var(--pen)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M0 13 L0 27" stroke="var(--pen)" stroke-width="1.6" stroke-linecap="round" />
    </g>
  </svg>
</template>
