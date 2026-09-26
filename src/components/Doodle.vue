<script setup>
import { computed } from "vue";
import { drawDoodle } from "../utils/doodles";

// One scribble from the doodle library, in whoever's pen drew it.
const props = defineProps({
  name: { type: String, required: true },
  seed: { type: String, required: true },
  size: { type: Number, default: 28 },
  ink: { type: String, default: "var(--pen)" },
  rot: { type: Number, default: 0 },
});

const d = computed(() => drawDoodle(props.name, props.seed));
</script>

<template>
  <span
    v-if="d.word"
    class="pen inline-block whitespace-nowrap"
    :style="{ color: ink, fontSize: `${size * 0.85}px`, transform: `rotate(${rot}deg)` }"
    aria-hidden="true"
  >{{ d.word }}</span>
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
      style="mix-blend-mode: multiply"
    />
  </svg>
</template>
