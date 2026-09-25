<script setup>
import { computed } from "vue";
import { scatterRand } from "../utils/scatter";

// ♀ / ♂ drawn by hand rather than set in type: a wobbly ring and its mark.
const props = defineProps({
  kind: { type: String, default: "female" }, // female | male
  seed: { type: String, default: "glyph" },
  size: { type: Number, default: 30 },
  weight: { type: Number, default: 2 },
});

const paths = computed(() => {
  const rand = scatterRand(`glyph:${props.seed}:${props.kind}`);
  const j = (n) => (rand() * 2 - 1) * n;
  const cx = props.kind === "male" ? 13 : 16;
  const cy = props.kind === "male" ? 21 : 13;
  const r = 8.5;
  const pts = [];
  const start = -1.2 + j(0.4);
  for (let i = 0; i <= 26; i += 1) {
    const a = start + (i / 26) * Math.PI * 2.12;
    const w = 1 + j(0.06);
    pts.push(`${(cx + Math.cos(a) * r * w).toFixed(1)} ${(cy + Math.sin(a) * r * w).toFixed(1)}`);
  }
  const ring = `M${pts.join(" L")}`;
  if (props.kind === "male") {
    const x0 = cx + 6;
    const y0 = cy - 6;
    const x1 = 27 + j(1);
    const y1 = 5 + j(1);
    return [ring, `M${x0} ${y0} L${x1} ${y1}`, `M${x1 - 7 + j(1)} ${y1 + j(0.8)} L${x1} ${y1} L${x1 + j(0.8)} ${y1 + 7 + j(1)}`];
  }
  return [ring, `M${cx + j(0.8)} ${cy + r} L${cx + j(1)} ${cy + r + 11}`, `M${cx - 5 + j(1)} ${cy + r + 5.5 + j(1)} L${cx + 5 + j(1)} ${cy + r + 5 + j(1)}`];
});
</script>

<template>
  <svg :width="size" :height="size * 1.1" viewBox="0 0 32 35" class="overflow-visible" aria-hidden="true">
    <path
      v-for="(d, i) in paths"
      :key="i"
      :d="d"
      fill="none"
      stroke="var(--pen)"
      :stroke-width="weight"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
