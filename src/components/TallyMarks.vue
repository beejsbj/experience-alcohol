<script setup>
import { computed } from "vue";

const props = defineProps({
  count: { type: Number, required: true },
});

const strokes = computed(() => {
  const out = [];
  const groups = Math.ceil(props.count / 5);
  for (let g = 0; g < groups; g += 1) {
    const inGroup = Math.min(5, props.count - g * 5);
    const baseX = g * 26;
    for (let i = 0; i < Math.min(inGroup, 4); i += 1) {
      const x = baseX + 4 + i * 5;
      out.push({
        x1: +(x + Math.sin(g * 3 + i) * 0.8).toFixed(2),
        y1: 2 + (i % 2),
        x2: +(x - 1 + Math.cos(i) * 0.7).toFixed(2),
        y2: +(11 - (i % 2) * 0.6).toFixed(2),
      });
    }
    if (inGroup === 5) {
      out.push({ x1: baseX, y1: 9.5, x2: baseX + 21, y2: 3.5 });
    }
  }
  return out;
});

const width = computed(() => Math.max(1, Math.ceil(props.count / 5)) * 26);
</script>

<template>
  <svg
    v-if="count > 0"
    :width="width"
    height="13"
    :viewBox="`0 0 ${width} 13`"
    aria-hidden="true"
    class="mx-auto block"
  >
    <line
      v-for="(stroke, index) in strokes"
      :key="index"
      v-bind="stroke"
      stroke="var(--pen)"
      stroke-width="1.7"
      stroke-linecap="round"
    />
  </svg>
</template>
