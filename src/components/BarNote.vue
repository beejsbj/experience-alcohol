<script setup>
import { computed } from "vue";
import { scatterRand } from "../utils/scatter";

// The bar writes in black marker. A line is written on character by
// character, each one sitting a little off its baseline the way a fat
// chisel tip does. Keyed on the text so a new line is written over the old
// one, not swapped in.
const props = defineProps({
  text: { type: String, required: true },
  seed: { type: String, required: true },
  size: { type: Number, default: 13.5 },
  // ms per character; the whole line finishes in under a second
  pace: { type: Number, default: 22 },
  // ms before the marker touches the paper
  delay: { type: Number, default: 0 },
});

const words = computed(() => {
  const rand = scatterRand(`marker:${props.seed}:${props.text}`);
  let i = 0;
  return props.text.split(" ").map((word) => ({
    word,
    chars: [...word].map((char) => {
      const n = i;
      i += 1;
      return {
        char,
        style: {
          transform: `rotate(${((rand() * 2 - 1) * 4).toFixed(1)}deg) translateY(${((rand() * 2 - 1) * 1.2).toFixed(1)}px)`,
          animationDelay: `${props.delay + Math.min(n * props.pace, 1400)}ms`,
        },
      };
    }),
  }));
});

const tilt = computed(() => ((scatterRand(`marker-tilt:${props.seed}`)() * 2 - 1) * 2.4).toFixed(2));
</script>

<template>
  <p
    :key="text"
    class="marker"
    :style="{ fontSize: `${size}px`, transform: `rotate(${tilt}deg)` }"
    :aria-label="text"
  >
    <template v-for="(w, wi) in words" :key="wi">
      <span class="inline-block whitespace-nowrap" aria-hidden="true">
        <span v-for="(c, ci) in w.chars" :key="ci" class="marker__char" :style="c.style">{{ c.char }}</span>
      </span>
      <span v-if="wi < words.length - 1" aria-hidden="true">{{ " " }}</span>
    </template>
  </p>
</template>
