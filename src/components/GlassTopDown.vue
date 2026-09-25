<script setup>
import { computed } from "vue";
import { scatterRand } from "../utils/scatter";

// A glass seen from straight above, under the lamp. `fill` is how far the
// bartender has got with the next one: 0 = drained, 1 = poured and waiting.
const props = defineProps({
  kind: { type: String, default: "custom" }, // beer | wine | cocktail | shot | custom
  fill: { type: Number, default: 1 },
  size: { type: Number, default: 60 },
  seed: { type: String, default: "glass" },
});

// Custom pours get a seeded colour of their own, from a bar's worth of liquids.
const CUSTOM_LIQUIDS = [
  ["#c2410c", "#7c2d12"], // negroni-ish
  ["#d9a441", "#8a5a16"], // old fashioned
  ["#9bbf4a", "#4d6b1c"], // chartreuse
  ["#e7c6d2", "#b0647f"], // something pink
  ["#b7d3de", "#6f97a8"], // gin & tonic
];

const look = computed(() => {
  const rand = scatterRand(`glass:${props.seed}`);
  switch (props.kind) {
    case "beer":
      return { rim: 0.92, wall: 3.6, liquid: ["#e6a53a", "#9b5d13"], head: "#f4e7c9", headR: 0.8 };
    case "wine":
      return { rim: 0.86, wall: 1.4, liquid: ["#8f1f35", "#3f0612"] };
    case "cocktail":
      return { rim: 0.94, wall: 1.6, liquid: ["#f2d98a", "#c99a3c"], twist: true };
    case "shot":
      return { rim: 0.9, wall: 5.5, liquid: ["#c26a22", "#5e2a08"] };
    default:
      return { rim: 0.88, wall: 3, liquid: CUSTOM_LIQUIDS[Math.floor(rand() * CUSTOM_LIQUIDS.length)], ice: true };
  }
});

const id = computed(() => `g-${props.seed.replace(/[^a-z0-9]/gi, "")}`);
const R = 50; // viewBox radius
const inner = computed(() => R * look.value.rim - look.value.wall);
const pool = computed(() => inner.value * Math.max(0, Math.min(1, props.fill)));
</script>

<template>
  <svg :width="size" :height="size" viewBox="-60 -60 120 120" class="overflow-visible" aria-hidden="true">
    <defs>
      <radialGradient :id="`${id}-liq`" cx="40%" cy="35%" r="75%">
        <stop offset="0%" :stop-color="look.liquid[0]" />
        <stop offset="100%" :stop-color="look.liquid[1]" />
      </radialGradient>
      <radialGradient :id="`${id}-glass`" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stop-color="rgba(255,250,240,0.34)" />
        <stop offset="60%" stop-color="rgba(255,240,220,0.12)" />
        <stop offset="100%" stop-color="rgba(255,230,200,0.2)" />
      </radialGradient>
      <radialGradient :id="`${id}-foam`" cx="45%" cy="40%" r="70%">
        <stop offset="0%" stop-color="#fffaf0" />
        <stop offset="100%" :stop-color="look.head || '#fff'" />
      </radialGradient>
      <clipPath :id="`${id}-in`">
        <circle :r="inner" />
      </clipPath>
    </defs>

    <!-- shadow on the mat, thrown away from the lamp -->
    <ellipse cx="4" cy="9" :rx="R * look.rim + 4" :ry="R * look.rim + 2" fill="rgba(0,0,0,0.55)" style="filter: blur(4px)" />

    <!-- the glass body -->
    <circle :r="R * look.rim" :fill="`url(#${id}-glass)`" stroke="rgba(255,236,210,0.28)" :stroke-width="look.wall" />

    <!-- the base of the glass, seen through it -->
    <circle :r="inner * 0.72" fill="none" stroke="rgba(255,240,220,0.22)" stroke-width="1.6" />
    <circle :r="inner * 0.72 - 3" fill="rgba(255,240,220,0.05)" />

    <!-- the pour, spreading from the middle as the glass fills -->
    <g :clip-path="`url(#${id}-in)`">
      <circle
        :r="inner"
        :fill="`url(#${id}-liq)`"
        :style="{ transform: `scale(${(pool / inner).toFixed(3)})`, transition: 'transform 900ms cubic-bezier(.4,.8,.3,1)' }"
      />
      <!-- foam head on a beer -->
      <g
        v-if="look.head"
        :style="{ transform: `scale(${(Math.max(0, pool / inner - 0.15) / 0.85).toFixed(3)})`, transition: 'transform 900ms ease' }"
      >
        <circle :r="inner * look.headR" :fill="`url(#${id}-foam)`" />
        <circle v-for="n in 9" :key="n" :cx="Math.cos(n * 2.1) * inner * 0.5" :cy="Math.sin(n * 1.7) * inner * 0.5" :r="1.2 + (n % 3)" fill="rgba(210,180,120,0.35)" />
      </g>
      <!-- a twist of lemon peel on the coupe -->
      <path
        v-if="look.twist && fill > 0.6"
        d="M -18 8 C -8 -6, 10 -8, 20 2"
        fill="none"
        stroke="#f1c232"
        stroke-width="5"
        stroke-linecap="round"
        :opacity="Math.min(1, (fill - 0.6) * 2.5)"
      />
      <!-- one big cube in a house special -->
      <rect
        v-if="look.ice && fill > 0.3"
        x="-14"
        y="-16"
        width="26"
        height="26"
        rx="6"
        fill="rgba(255,255,255,0.28)"
        stroke="rgba(255,255,255,0.45)"
        stroke-width="1.2"
        transform="rotate(14)"
        :opacity="Math.min(1, fill * 1.4)"
      />
      <!-- dregs, when it's empty -->
      <circle v-if="fill < 0.15" :r="inner * 0.35" :fill="look.liquid[1]" opacity="0.18" />
    </g>

    <!-- the lamp caught on the rim -->
    <path
      :d="`M ${-R * look.rim * 0.7} ${-R * look.rim * 0.55} A ${R * look.rim} ${R * look.rim} 0 0 1 ${R * look.rim * 0.35} ${-R * look.rim * 0.93}`"
      fill="none"
      stroke="rgba(255,248,235,0.75)"
      stroke-width="2.4"
      stroke-linecap="round"
    />
    <circle :r="R * look.rim" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="0.8" />
  </svg>
</template>
