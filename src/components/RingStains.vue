<script setup>
import { computed } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { ringFor } from "../utils/paper";

// Every pour sets a glass down somewhere on the wood. The table keeps the
// ring: wet and glossy at first, drying to a faint stain by the end of the night.
const store = useSessionStore();
const now = useLiveNow();

// Wetness only needs minute resolution; don't re-render every second.
const minute = computed(() => Math.floor(now.value / 60000) * 60000);

const rings = computed(() =>
  store.session.events.map((event) => {
    const ring = ringFor(event, minute.value);
    const size = Math.ceil(ring.r * 2 + 16);
    const c = size / 2;
    const circ = 2 * Math.PI * ring.r;
    return {
      ...ring,
      size,
      c,
      circ,
      // the dry outline, broken where the glass lifted first
      dash: `${(circ * (1 - ring.gap / 360)).toFixed(1)} ${(circ * (ring.gap / 360)).toFixed(1)}`,
      opacity: 0.3 + ring.wet * 0.45,
      fresh: ring.ageMin < 0.2,
    };
  })
);
</script>

<template>
  <div class="absolute inset-0" aria-hidden="true">
    <svg width="0" height="0" style="position: absolute">
      <filter id="ring-rough" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="3" />
        <feDisplacementMap in="SourceGraphic" scale="3.2" />
      </filter>
    </svg>
    <svg
      v-for="ring in rings"
      :key="ring.id"
      class="absolute"
      :width="ring.size"
      :height="ring.size"
      :viewBox="`0 0 ${ring.size} ${ring.size}`"
      :style="{
        left: `calc(${ring.x}% - ${ring.c}px)`,
        top: `calc(${ring.y}% - ${ring.c}px)`,
        opacity: ring.opacity,
        animation: ring.fresh ? 'ring-set 700ms ease-out both' : undefined,
      }"
    >
      <g :transform="`rotate(${ring.rot.toFixed(1)} ${ring.c} ${ring.c})`" filter="url(#ring-rough)">
        <!-- the water that pooled under the glass, while it's still wet -->
        <circle
          v-if="ring.wet > 0"
          :cx="ring.c"
          :cy="ring.c"
          :r="ring.r - 1"
          :fill="`rgba(20, 10, 4, ${(ring.wet * 0.28).toFixed(2)})`"
        />
        <circle
          :cx="ring.c"
          :cy="ring.c"
          :r="ring.r"
          fill="none"
          stroke="rgba(12, 6, 2, 0.75)"
          stroke-width="2.4"
          :stroke-dasharray="ring.dash"
        />
        <!-- heavier arc where the drip collected -->
        <circle
          :cx="ring.c"
          :cy="ring.c"
          :r="ring.r - 0.6"
          fill="none"
          stroke="rgba(12, 6, 2, 0.5)"
          stroke-width="4.5"
          :stroke-dasharray="`${(ring.circ * 0.18).toFixed(1)} ${ring.circ.toFixed(1)}`"
          :transform="`rotate(${ring.pool.toFixed(0)} ${ring.c} ${ring.c})`"
        />
        <!-- lamp caught in the wet edge -->
        <circle
          v-if="ring.wet > 0.05"
          :cx="ring.c"
          :cy="ring.c"
          :r="ring.r - 2.2"
          fill="none"
          :stroke="`rgba(255, 214, 160, ${(ring.wet * 0.55).toFixed(2)})`"
          stroke-width="1.1"
          :stroke-dasharray="`${(ring.circ * 0.22).toFixed(1)} ${ring.circ.toFixed(1)}`"
          :transform="`rotate(${(200 - ring.rot).toFixed(0)} ${ring.c} ${ring.c})`"
        />
      </g>
    </svg>
  </div>
</template>
