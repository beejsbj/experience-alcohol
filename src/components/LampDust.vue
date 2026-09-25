<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { scatterRand } from "../utils/scatter";

// Dust turning slowly in the lamp's beam. Every mote is seeded, so the
// air moves the same way each night; the drunker the table, the more it swims.
const props = defineProps({
  intensity: { type: Number, default: 0 }, // 0..1
});

const canvasRef = ref(null);
let ctx = null;
let raf = 0;
let w = 0;
let h = 0;
let swim = 0;

const reduced =
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const rand = scatterRand("lamp-dust");
const MOTES = Array.from({ length: 46 }, () => ({
  x: rand(),
  y: rand(),
  r: 0.5 + rand() * rand() * 2.6,
  a: 0.25 + rand() * 0.55,
  vy: 3 + rand() * 9, // px/s upward drift in warm air
  fx: 0.05 + rand() * 0.12,
  ax: 6 + rand() * 18,
  p: rand() * Math.PI * 2,
  blur: rand() > 0.82,
}));

// How much of the lamp reaches a point (beam centred near the top third).
const beam = (x, y) => {
  const dx = (x - w * 0.5) / (w * 0.55);
  const dy = (y - h * 0.32) / (h * 0.42);
  return Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
};

const resize = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  w = window.innerWidth;
  h = window.innerHeight;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
};

const draw = (time) => {
  const t = time / 1000;
  swim += (props.intensity - swim) * 0.02;
  ctx.clearRect(0, 0, w, h);
  for (const m of MOTES) {
    const span = h + 40;
    const y = ((m.y * span - t * m.vy * (1 + swim)) % span + span) % span - 20;
    const x = m.x * w + Math.sin(t * m.fx * (1 + swim * 2) + m.p) * m.ax * (1 + swim * 2.5);
    const light = beam(x, y);
    if (light <= 0.02) continue;
    ctx.globalAlpha = m.a * light;
    ctx.fillStyle = "rgb(255, 222, 170)";
    ctx.beginPath();
    ctx.arc(x, y, m.blur ? m.r * 2.4 : m.r, 0, Math.PI * 2);
    if (m.blur) ctx.globalAlpha *= 0.35;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

const tick = (time) => {
  draw(time);
  raf = requestAnimationFrame(tick);
};

onMounted(() => {
  ctx = canvasRef.value.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
  if (reduced) draw(0);
  else raf = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  window.removeEventListener("resize", resize);
});
</script>

<template>
  <canvas ref="canvasRef" class="absolute inset-0 h-full w-full" aria-hidden="true"></canvas>
</template>
