<script setup>
import { computed } from "vue";
import { scatterRand } from "../utils/scatter";

const props = defineProps({
  seed: { type: String, required: true },
  dir: { type: String, default: "left" }, // arrowhead points left or right
  color: { type: String, default: "var(--pen)" },
  width: { type: Number, default: 34 },
  height: { type: Number, default: 20 },
});

const geo = computed(() => {
  const rand = scatterRand(`arrow:${props.seed}`);
  const j = (range) => (rand() * 2 - 1) * range;
  const w = props.width;
  const h = props.height;
  const flip = props.dir === "right";
  const fx = (x) => (flip ? w - x : x);
  const pt = (x, y) => ({ x: fx(x), y });

  // Gentle stroke: tail low on the label side, head high on the target side,
  // with a shallow bow — not a deep hook.
  const tail = pt(w - 3 + j(2), h * 0.75 + j(2));
  const head = pt(4 + j(1.5), h * 0.3 + j(2));
  const mx = (tail.x + head.x) / 2;
  const my = (tail.y + head.y) / 2;
  const dx = head.x - tail.x;
  const dy = head.y - tail.y;
  const len = Math.hypot(dx, dy) || 1;
  const bow = h * 0.22 + j(1.5);
  const ctrl = { x: mx - (dy / len) * bow, y: my + (dx / len) * bow };

  // Barbs follow the actual tangent at the head, so the arrowhead always
  // points along the stroke no matter how the curve jitters.
  const ang = Math.atan2(head.y - ctrl.y, head.x - ctrl.x);
  const barb = (da) => {
    const a = ang + Math.PI + da;
    const blen = 6.5 + j(1);
    return `M ${(head.x + Math.cos(a) * blen).toFixed(1)} ${(head.y + Math.sin(a) * blen).toFixed(1)} L ${head.x.toFixed(1)} ${head.y.toFixed(1)}`;
  };

  return {
    path: `M ${tail.x.toFixed(1)} ${tail.y.toFixed(1)} Q ${ctrl.x.toFixed(1)} ${ctrl.y.toFixed(1)} ${head.x.toFixed(1)} ${head.y.toFixed(1)}`,
    a1: barb(0.5 + j(0.08)),
    a2: barb(-0.5 + j(0.08)),
  };
});
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    aria-hidden="true"
    style="flex-shrink: 0; overflow: visible"
  >
    <path :d="geo.path" fill="none" :stroke="color" stroke-width="1.5" stroke-linecap="round" />
    <path :d="geo.a1" fill="none" :stroke="color" stroke-width="1.5" stroke-linecap="round" />
    <path :d="geo.a2" fill="none" :stroke="color" stroke-width="1.5" stroke-linecap="round" />
  </svg>
</template>
