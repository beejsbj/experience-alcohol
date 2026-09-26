<script setup>
import { computed, ref, watch } from "vue";
import { scatterRand } from "../utils/scatter";

const props = defineProps({
  count: { type: Number, required: true },
  seed: { type: String, default: "tally" },
  size: { type: Number, default: 14 },
  color: { type: String, default: "var(--pen)" },
});

const strokes = computed(() => {
  const out = [];
  const groups = Math.ceil(props.count / 5);
  for (let g = 0; g < groups; g += 1) {
    const inGroup = Math.min(5, props.count - g * 5);
    const baseX = g * 28;
    const rand = scatterRand(`${props.seed}:g${g}`);
    for (let i = 0; i < Math.min(inGroup, 4); i += 1) {
      const x = baseX + 4 + i * 5.5;
      // Looser jitter via scatterRand (vs original sin/cos)
      const jx = (rand() * 2 - 1) * 1.4;
      const jy1 = (rand() * 2 - 1) * 1.2;
      const jy2 = (rand() * 2 - 1) * 1.2;
      out.push({
        x1: +(x + jx).toFixed(2),
        y1: +(2 + jy1).toFixed(2),
        x2: +(x - 1 + (rand() * 2 - 1) * 0.9).toFixed(2),
        y2: +(11 + jy2).toFixed(2),
      });
    }
    if (inGroup === 5) {
      const jx1 = (rand() * 2 - 1) * 1.2;
      const jy1 = (rand() * 2 - 1) * 1.0;
      const jx2 = (rand() * 2 - 1) * 1.2;
      const jy2 = (rand() * 2 - 1) * 1.0;
      out.push({
        x1: +(baseX + jx1).toFixed(2),
        y1: +(9.5 + jy1).toFixed(2),
        x2: +(baseX + 22 + jx2).toFixed(2),
        y2: +(3.5 + jy2).toFixed(2),
      });
    }
  }
  return out;
});

const width = computed(() => Math.max(1, Math.ceil(props.count / 5)) * 28);

// Stroke i is pour i+1, so a new pour draws only its own stroke; the ones
// already down stay put. Nothing animates on first sight of the paper.
const settled = ref(props.count);
watch(
  () => props.count,
  (n, was) => {
    settled.value = Math.min(was, n);
  }
);
const drawing = (index) => index >= settled.value;
</script>

<template>
  <svg
    v-if="count > 0"
    :width="(width * size) / 14"
    :height="size"
    :viewBox="`0 0 ${width} 14`"
    aria-hidden="true"
  >
    <line
      v-for="(stroke, index) in strokes"
      :key="index"
      v-bind="stroke"
      :stroke="color"
      stroke-width="1.8"
      stroke-linecap="round"
      pathLength="100"
      :class="{ 'tally-new': drawing(index) }"
      @animationend="settled = Math.max(settled, index + 1)"
    />
  </svg>
</template>

<style scoped>
/* a quick pen flick: fast out of the gate, eases off as the nib lifts */
.tally-new {
  stroke-dasharray: 100;
  animation:
    pen-draw 240ms cubic-bezier(0.3, 0.7, 0.4, 1) 80ms backwards,
    ink-pool 180ms ease-out 300ms;
  --len: 100;
}
/* the nib lifts and a little ink pools at the end of the stroke */
@keyframes ink-pool {
  40% {
    stroke-width: 2.4;
  }
}
</style>
