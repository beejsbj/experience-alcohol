<script setup>
import { computed } from "vue";
import { drawDoodle } from "../utils/doodles";

// One scribble from the doodle library, in whoever's pen drew it. Strokes
// are drawn on in order (dashoffset only); a word is written letter by letter.
const props = defineProps({
  name: { type: String, required: true },
  seed: { type: String, required: true },
  size: { type: Number, default: 28 },
  ink: { type: String, default: "var(--pen)" },
  rot: { type: Number, default: 0 },
  // ms before the pen touches the paper
  delay: { type: Number, default: 0 },
});

const d = computed(() => drawDoodle(props.name, props.seed));
const strokeStyle = (i) => ({
  animation: `pen-draw 360ms ease-out ${props.delay + i * 110}ms backwards`,
  "--len": 100,
});
const charStyle = (i) => ({ animationDelay: `${props.delay + i * 45}ms` });
</script>

<template>
  <span
    v-if="d.word"
    class="pen inline-block whitespace-nowrap"
    :style="{ color: ink, fontSize: `${size * 0.85}px`, transform: `rotate(${rot}deg)` }"
    aria-hidden="true"
  ><span v-for="(c, i) in d.word" :key="i" class="doodle__char" :style="charStyle(i)">{{ c === " " ? " " : c }}</span></span>
  <svg
    v-else
    :width="size"
    :height="size"
    viewBox="0 0 40 40"
    class="inline-block overflow-visible"
    :style="{ transform: `rotate(${rot}deg)` }"
    aria-hidden="true"
  >
    <path
      v-for="(p, i) in d.paths"
      :key="i"
      :d="p"
      fill="none"
      :stroke="ink"
      stroke-width="1.9"
      stroke-linecap="round"
      stroke-linejoin="round"
      pathLength="100"
      stroke-dasharray="100"
      :style="strokeStyle(i)"
      style="mix-blend-mode: multiply"
    />
  </svg>
</template>
