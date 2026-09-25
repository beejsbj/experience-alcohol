<script setup>
import { computed } from "vue";
import { underlinePath, underlineStyle } from "../utils/doodles";

// The line under how you're feeling. Neat and straight when sober, a wave
// when tipsy, loops and scribbles further in. Tap the word for another.
const props = defineProps({
  seed: { type: String, required: true },
  bac: { type: Number, default: 0 },
  nudge: { type: Number, default: 0 },
  width: { type: Number, default: 236 },
});

const style = computed(() => underlineStyle(props.seed, props.bac, props.nudge));
const paths = computed(() =>
  underlinePath(style.value, `${props.seed}:${props.nudge}`, props.width, Math.min(1, props.bac / 0.15))
);
</script>

<template>
  <svg :width="width" height="18" :viewBox="`0 -2 ${width} 18`" class="block overflow-visible" aria-hidden="true">
    <path
      v-for="(d, i) in paths"
      :key="`${style}:${nudge}:${i}`"
      :d="d"
      fill="none"
      stroke="var(--pen)"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      pathLength="500"
      stroke-dasharray="500"
      style="animation: pen-draw 520ms ease-out both; --len: 500"
      :style="{ animationDelay: `${i * 160}ms` }"
    />
  </svg>
</template>
