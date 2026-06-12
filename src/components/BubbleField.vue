<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  intensity: { type: Number, default: 0 }, // 0..1
});

const canvasRef = ref(null);
let ctx = null;
let raf = 0;
let bubbles = [];
let lastTime = 0;

const reduced = typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const targetCount = () => Math.round(4 + props.intensity * 26);

const spawn = (height, width, atBottom = true) => ({
  x: Math.random() * width,
  y: atBottom ? height + 20 : Math.random() * height,
  r: 3 + Math.random() * 11,
  v: (18 + Math.random() * 30) * (0.6 + props.intensity),
  a: 0.12 + Math.random() * 0.22,
});

const resize = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
};

const tick = (time) => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
  lastTime = time;

  while (bubbles.length < targetCount()) bubbles.push(spawn(height, width, bubbles.length > 4));
  if (bubbles.length > targetCount()) bubbles.length = targetCount();

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(232, 163, 60, 0.5)";
  for (const bubble of bubbles) {
    bubble.y -= bubble.v * dt;
    bubble.x += Math.sin(time / 900 + bubble.r) * 0.2;
    if (bubble.y < -20) Object.assign(bubble, spawn(height, width));
    ctx.globalAlpha = bubble.a;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (!reduced) raf = requestAnimationFrame(tick);
};

onMounted(() => {
  ctx = canvasRef.value.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  window.removeEventListener("resize", resize);
});

watch(() => props.intensity, () => { /* count adjusts in tick */ });
</script>

<template>
  <canvas ref="canvasRef" class="fixed inset-0" aria-hidden="true"></canvas>
</template>
