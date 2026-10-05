<script setup>
import { computed } from "vue";
import { scatterRand } from "../utils/scatter";

// The bar writes in black brush marker and signs itself, the way a friend
// signs a note. A line is written on character by character, each one
// sitting a little off its baseline; the signature follows a beat later.
// Keyed on the text so a new line is written over the old one, not swapped.
const props = defineProps({
  text: { type: String, required: true },
  seed: { type: String, required: true },
  size: { type: Number, default: 16 },
  // ms per character; the whole line finishes in about a second
  pace: { type: Number, default: 22 },
  // ms before the marker touches the paper
  delay: { type: Number, default: 0 },
  signed: { type: Boolean, default: true },
});

const SIGNATURE = "— the bar";

// Curly quotes and apostrophes: a brush marker draws them as proper marks,
// where a straight tick can read as a letter. Punctuation also stays
// upright; only letters get the hand's wobble.
const typeset = (text) =>
  text
    .replace(/(^|[\s(])"/g, "$1“")
    .replaceAll('"', "”")
    .replace(/(^|[\s(])'/g, "$1‘")
    .replaceAll("'", "’");
const PUNCT = /[‘’“”.,;:!?…()\-—]/;

const words = computed(() => {
  const rand = scatterRand(`marker:${props.seed}:${props.text}`);
  let i = 0;
  return typeset(props.text).split(" ").map((word) => ({
    word,
    chars: [...word].map((char) => {
      const n = i;
      i += 1;
      const tilt = PUNCT.test(char) ? 0 : (rand() * 2 - 1) * 4;
      const dy = PUNCT.test(char) ? 0 : (rand() * 2 - 1) * 1.2;
      return {
        char,
        style: {
          transform: `rotate(${tilt.toFixed(1)}deg) translateY(${dy.toFixed(1)}px)`,
          animationDelay: `${props.delay + Math.min(n * props.pace, 1400)}ms`,
        },
      };
    }),
  }));
});

// The signature lands once the line is written.
const signDelay = computed(() => props.delay + Math.min(props.text.length * props.pace, 1400) + 160);
const tilt = computed(() => ((scatterRand(`marker-tilt:${props.seed}`)() * 2 - 1) * 2.4).toFixed(2));
</script>

<template>
  <p
    :key="text"
    class="marker"
    :style="{ fontSize: `${size}px`, transform: `rotate(${tilt}deg)` }"
    :aria-label="signed ? `${text} ${SIGNATURE}` : text"
  >
    <span class="marker__line">
      <template v-for="(w, wi) in words" :key="wi">
        <span class="marker__word" aria-hidden="true">
          <span v-for="(c, ci) in w.chars" :key="ci" class="marker__char" :style="c.style">{{ c.char }}</span>
        </span>
        <span v-if="wi < words.length - 1" aria-hidden="true">{{ " " }}</span>
      </template>
    </span>
    <template v-if="signed">
      <span class="marker__sign marker__char" aria-hidden="true" :style="{ animationDelay: `${signDelay}ms` }">{{ SIGNATURE }}</span>
    </template>
  </p>
</template>

<style scoped>
.marker__word {
  display: inline-block;
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
}
.marker__line {
  display: block;
  max-width: 24ch;
  margin-left: auto;
  text-wrap: balance;
}
</style>
