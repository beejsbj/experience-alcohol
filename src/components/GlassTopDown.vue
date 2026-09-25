<script setup>
import { computed } from "vue";
import { scatterRand } from "../utils/scatter";

// A drink seen from straight above, under the lamp. `fill` is how far the
// bartender has got with the next one: 0 = drained, 1 = poured and waiting.
// Cans and bottles can't fill up, so they come back sealed when it's time.
const props = defineProps({
  // beer | mug | wine | cocktail | shot | flute | highball | can | bottle | custom
  kind: { type: String, default: "custom" },
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
const CAN_COLOURS = ["#b3261e", "#1f4e8c", "#2f6b45", "#d9a441", "#222"];
const BOTTLE_GLASS = [
  ["#6b3a12", "#2a1606"],
  ["#3f6b2c", "#16300f"],
];

const look = computed(() => {
  const rand = scatterRand(`glass:${props.seed}`);
  switch (props.kind) {
    case "beer":
      return { rim: 0.92, wall: 3.6, liquid: ["#e6a53a", "#9b5d13"], head: "#f4e7c9", headR: 0.8 };
    case "mug":
      return { rim: 0.86, wall: 5, liquid: ["#e6a53a", "#9b5d13"], head: "#f4e7c9", headR: 0.84, handle: true };
    case "wine":
      return { rim: 0.86, wall: 1.4, liquid: ["#8f1f35", "#3f0612"] };
    case "cocktail":
      return { rim: 0.94, wall: 1.6, liquid: ["#f2d98a", "#c99a3c"], twist: true };
    case "shot":
      return { rim: 0.9, wall: 5.5, liquid: ["#c26a22", "#5e2a08"] };
    case "flute":
      return { rim: 0.7, wall: 1.4, liquid: ["#f7e6a8", "#d4b25a"], fizz: true };
    case "highball":
      return { rim: 0.84, wall: 2.4, liquid: ["#f3ecd6", "#c9b98e"], lime: true, straw: true, ice: true };
    case "can":
      return { can: CAN_COLOURS[Math.floor(rand() * CAN_COLOURS.length)] };
    case "bottle":
      return { bottle: BOTTLE_GLASS[Math.floor(rand() * BOTTLE_GLASS.length)], cap: rand() > 0.5 ? "#b3261e" : "#c9973f" };
    default:
      return { rim: 0.88, wall: 3, liquid: CUSTOM_LIQUIDS[Math.floor(rand() * CUSTOM_LIQUIDS.length)], ice: true };
  }
});

const id = computed(() => `g-${props.seed.replace(/[^a-z0-9]/gi, "")}-${props.kind}`);
const R = 50; // viewBox radius
const inner = computed(() => R * (look.value.rim ?? 0.8) - (look.value.wall ?? 2));
const pool = computed(() => inner.value * Math.max(0, Math.min(1, props.fill)));
const sealed = computed(() => props.fill >= 0.97);

// Crimped crown cap: 21 teeth round the edge.
const crown = computed(() => {
  const pts = [];
  for (let i = 0; i < 42; i += 1) {
    const a = (i / 42) * Math.PI * 2;
    const r = i % 2 ? 11 : 13;
    pts.push(`${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${pts.join(" L")} Z`;
});
</script>

<template>
  <svg :width="size" :height="size" viewBox="-60 -60 120 120" class="overflow-visible" aria-hidden="true">
    <defs>
      <radialGradient :id="`${id}-liq`" cx="40%" cy="35%" r="75%">
        <stop offset="0%" :stop-color="look.liquid?.[0] ?? '#d9a441'" />
        <stop offset="100%" :stop-color="look.liquid?.[1] ?? '#8a5a16'" />
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
      <radialGradient :id="`${id}-metal`" cx="38%" cy="32%" r="80%">
        <stop offset="0%" stop-color="#f4f4f2" />
        <stop offset="55%" stop-color="#b9b9b6" />
        <stop offset="100%" stop-color="#7b7b78" />
      </radialGradient>
      <radialGradient :id="`${id}-bottle`" cx="36%" cy="30%" r="80%">
        <stop offset="0%" :stop-color="look.bottle?.[0] ?? '#6b3a12'" />
        <stop offset="100%" :stop-color="look.bottle?.[1] ?? '#2a1606'" />
      </radialGradient>
      <radialGradient :id="`${id}-cap`" cx="38%" cy="32%" r="75%">
        <stop offset="0%" stop-color="#fff3d6" />
        <stop offset="35%" :stop-color="look.cap ?? '#c9973f'" />
        <stop offset="100%" stop-color="#4a2a10" />
      </radialGradient>
      <clipPath :id="`${id}-in`">
        <circle :r="inner" />
      </clipPath>
    </defs>

    <!-- shadow on the mat, thrown away from the lamp -->
    <ellipse cx="4" cy="9" :rx="R * (look.rim ?? 0.8) + 4" :ry="R * (look.rim ?? 0.8) + 2" fill="rgba(0,0,0,0.55)" style="filter: blur(4px)" />

    <!-- ── a can, from above ──────────────────────────────── -->
    <g v-if="look.can">
      <circle r="41" :fill="look.can" />
      <circle r="38" :fill="`url(#${id}-metal)`" stroke="rgba(0,0,0,0.35)" stroke-width="1" />
      <circle r="31" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="1.5" />
      <circle r="28" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="0.8" />
      <!-- the drinking hole, once it's been cracked -->
      <path v-if="!sealed" d="M-12 -22 Q0 -30 12 -22 Q10 -12 0 -11 Q-10 -12 -12 -22 Z" fill="#1a120a" />
      <path v-if="!sealed && fill > 0.02" d="M-12 -22 Q0 -30 12 -22 Q10 -12 0 -11 Q-10 -12 -12 -22 Z" fill="#c98a2c" :opacity="Math.min(0.8, fill)" />
      <!-- pull tab: flat when sealed, lifted when opened -->
      <g :transform="sealed ? 'translate(0 4)' : 'translate(0 8) rotate(180)'">
        <rect x="-9" y="-10" width="18" height="28" rx="8" fill="#d8d8d5" stroke="#8a8a86" stroke-width="1" />
        <circle cy="9" r="5" fill="#a9a9a5" stroke="#7a7a76" stroke-width="0.8" />
      </g>
      <circle cy="-2" r="2.6" fill="#9b9b97" />
    </g>

    <!-- ── a bottle, from above ───────────────────────────── -->
    <g v-else-if="look.bottle">
      <circle r="34" :fill="`url(#${id}-bottle)`" stroke="rgba(0,0,0,0.4)" stroke-width="1" />
      <circle r="23" fill="none" stroke="rgba(255,240,210,0.18)" stroke-width="3" />
      <circle r="15" :fill="`url(#${id}-bottle)`" stroke="rgba(255,240,210,0.25)" stroke-width="2" />
      <path v-if="sealed" :d="crown" :fill="`url(#${id}-cap)`" stroke="rgba(0,0,0,0.45)" stroke-width="0.8" />
      <g v-else>
        <circle r="10" fill="#140b04" />
        <circle r="10" :fill="look.bottle[0]" :opacity="Math.min(0.9, fill)" />
      </g>
      <path d="M-24 -18 A 30 30 0 0 1 4 -30" fill="none" stroke="rgba(255,248,235,0.55)" stroke-width="2.4" stroke-linecap="round" />
    </g>

    <!-- ── a glass ────────────────────────────────────────── -->
    <g v-else>
      <!-- a mug's handle sticks out past the rim -->
      <rect v-if="look.handle" :x="R * look.rim - 6" y="-13" width="22" height="26" rx="10" fill="none" stroke="rgba(255,236,210,0.38)" stroke-width="6" />

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
        <!-- bubbles rising in a flute -->
        <g v-if="look.fizz && fill > 0.4" :opacity="Math.min(1, (fill - 0.4) * 2)">
          <circle v-for="n in 7" :key="n" :cx="Math.cos(n * 2.4) * inner * 0.55" :cy="Math.sin(n * 1.9) * inner * 0.55" :r="1 + (n % 2)" fill="rgba(255,255,240,0.7)" />
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
        <!-- ice -->
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
        <!-- lime wedge on a highball -->
        <g v-if="look.lime && fill > 0.5" :opacity="Math.min(1, (fill - 0.5) * 2)">
          <path d="M 4 14 A 16 16 0 0 0 30 -4 L 4 14 Z" fill="#8fbf3a" stroke="#4d7a18" stroke-width="2" />
          <path d="M 8 10 L 24 -1" stroke="rgba(255,255,230,0.6)" stroke-width="1" />
        </g>
        <!-- dregs, when it's empty -->
        <circle v-if="fill < 0.15" :r="inner * 0.35" :fill="look.liquid[1]" opacity="0.18" />
      </g>

      <!-- a straw -->
      <g v-if="look.straw">
        <circle cx="-16" cy="-14" r="5" fill="#f4efe6" stroke="#b3261e" stroke-width="2" />
        <circle cx="-16" cy="-14" r="2" fill="#3a1a10" />
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
    </g>
  </svg>
</template>
