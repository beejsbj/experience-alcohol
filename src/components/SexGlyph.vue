<script setup>
import { computed, ref, watch } from "vue";
import { scatterRand } from "../utils/scatter";

// ♀ / ♂ drawn by hand rather than set in type: a wobbly ring and its mark,
// the ring coloured in with a quick felt-tip scribble — pink or blue.
const props = defineProps({
  kind: { type: String, default: "female" }, // female | male
  seed: { type: String, default: "glyph" },
  size: { type: Number, default: 30 },
  weight: { type: Number, default: 2 },
});

const FELT = { female: "#e0619a", male: "#3a7bd5" };
const centre = computed(() => (props.kind === "male" ? [13, 21] : [16, 13]));

// Back-and-forth hatching across the ring, a little past its edge in places.
const scribble = computed(() => {
  const rand = scatterRand(`scribble:${props.seed}:${props.kind}`);
  const [cx, cy] = centre.value;
  const r = 8;
  const a = (-38 + (rand() * 2 - 1) * 8) * (Math.PI / 180);
  const [ux, uy, vx, vy] = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a)];
  const pts = [];
  let side = 1;
  for (let d = -r * 0.82; d <= r * 0.82; d += 2.1 + rand() * 0.5) {
    const half = Math.sqrt(r * r - d * d) * (0.88 + rand() * 0.2);
    const t = side * half;
    pts.push(`${(cx + ux * t + vx * d).toFixed(1)} ${(cy + uy * t + vy * d).toFixed(1)}`);
    side = -side;
  }
  return `M${pts.join(" L")}`;
});

// Swapping bodies scribbles the new colour in; first sight is already dry.
const fresh = ref(false);
watch(
  () => props.kind,
  () => {
    fresh.value = true;
  }
);

const paths = computed(() => {
  const rand = scatterRand(`glyph:${props.seed}:${props.kind}`);
  const j = (n) => (rand() * 2 - 1) * n;
  const [cx, cy] = centre.value;
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
      :key="kind"
      :d="scribble"
      fill="none"
      :stroke="FELT[kind] ?? FELT.male"
      stroke-width="2.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-opacity="0.72"
      pathLength="100"
      :class="{ 'scribble-new': fresh }"
      style="mix-blend-mode: multiply"
      @animationend="fresh = false"
    />
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

<style scoped>
.scribble-new {
  stroke-dasharray: 100;
  --len: 100;
  animation: pen-draw 360ms cubic-bezier(0.45, 0.2, 0.3, 1) backwards;
}
</style>
