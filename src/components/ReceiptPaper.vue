<script setup>
import { computed } from "vue";
import { tornEdge } from "../utils/paper";

// A strip of thermal paper torn off the roll: seeded teeth at both ends, lit
// from above, curling at the edges, casting its shadow onto the wood.
const props = defineProps({
  seed: { type: String, required: true },
  teeth: { type: Number, default: 34 },
  depth: { type: Number, default: 7 },
  top: { type: Boolean, default: true },
});

const clip = computed(() => tornEdge(props.seed, { teeth: props.teeth, depth: props.depth, top: props.top }));
</script>

<template>
  <div class="paper">
    <div class="paper__shadow" aria-hidden="true"></div>
    <div class="paper__sheet" :style="{ clipPath: clip, WebkitClipPath: clip }">
      <slot />
    </div>
  </div>
</template>
