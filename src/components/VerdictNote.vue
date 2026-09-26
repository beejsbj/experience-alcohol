<script setup>
import { computed } from "vue";
import { scatterRand } from "../utils/scatter";

// How the pace is going, written by hand — no rubber stamp. Emphasis comes
// from what the pen does around the words: a tick, a wave, a box, a ring.
const props = defineProps({
  verdict: { type: String, required: true }, // ON PACE | EASY NOW | SLOW DOWN | CUT OFF
  size: { type: Number, default: 30 },
  seed: { type: String, default: "verdict" },
});

const WORDS = { "ON PACE": "on pace", "EASY NOW": "easy now…", "SLOW DOWN": "slow down!", "CUT OFF": "cut off." };

const mark = computed(() => {
  const rand = scatterRand(`verdict:${props.seed}:${props.verdict}`);
  const j = (n) => ((rand() * 2 - 1) * n).toFixed(1);
  switch (props.verdict) {
    case "ON PACE":
      return { kind: "tick", d: [`M4 ${14 + +j(1)} L11 ${22 + +j(1)} L26 ${2 + +j(1.5)}`] };
    case "EASY NOW":
      return { kind: "under", d: [`M2 4 Q 14 ${0 + +j(1)}, 26 4 T 50 4 T 74 4 T 98 4 T 122 4`] };
    case "SLOW DOWN":
      return {
        kind: "box",
        d: [`M-6 ${-4 + +j(2)} L${104 + +j(3)} ${-7 + +j(2)} L${108 + +j(2)} ${40 + +j(2)} L${-4 + +j(2)} ${42 + +j(2)} L-8 ${-2 + +j(2)}`],
      };
    default: {
      const pts = [];
      for (let i = 0; i <= 28; i += 1) {
        const a = -2.3 + (i / 28) * Math.PI * 2.2;
        pts.push(`${(52 + Math.cos(a) * 60).toFixed(1)} ${(19 + Math.sin(a) * 26).toFixed(1)}`);
      }
      return { kind: "ring", d: [`M${pts.join(" L")}`, "M6 50 Q 50 46, 98 50", "M16 55 Q 55 51, 92 55"] };
    }
  }
});

const tilt = computed(() => (scatterRand(`verdict-tilt:${props.seed}:${props.verdict}`)() * 2 - 1) * 4 - 3);
</script>

<template>
  <span
    :key="verdict"
    class="relative inline-flex items-center gap-1"
    :style="{ transform: `rotate(${tilt}deg)`, animation: 'char-in 260ms ease-out both' }"
  >
    <svg v-if="mark.kind === 'tick'" :width="size * 0.9" :height="size * 0.8" viewBox="0 0 30 26" class="overflow-visible" aria-hidden="true">
      <path :d="mark.d[0]" fill="none" stroke="var(--pen)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span class="pen pen--hard whitespace-nowrap" :style="{ fontSize: `${size}px` }">{{ WORDS[verdict] ?? verdict.toLowerCase() }}</span>
    <svg
      v-if="mark.kind !== 'tick'"
      class="pointer-events-none absolute left-0 top-0 h-full w-full overflow-visible"
      :viewBox="mark.kind === 'under' ? '0 -34 122 40' : '0 0 100 36'"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        v-for="(d, i) in mark.d"
        :key="i"
        :d="d"
        fill="none"
        stroke="var(--pen)"
        :stroke-width="mark.kind === 'box' ? 1.6 : 1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  </span>
</template>
