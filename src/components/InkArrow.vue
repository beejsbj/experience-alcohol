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
