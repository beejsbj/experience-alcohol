<script setup>
import RingStains from "./RingStains.vue";
import LampDust from "./LampDust.vue";

// The whole room in one fixed layer: oak planks, the rings the night leaves,
// one lamp overhead, dust in its beam, and the dark closing in at the edges.
defineProps({
  intensity: { type: Number, default: 0 }, // 0..1, how far into the night
});
</script>

<template>
  <div class="bar-top" :style="{ '--drunk': intensity.toFixed(3) }" aria-hidden="true">
    <div class="bar-top__wood"></div>
    <RingStains />
    <div class="bar-top__lamp"></div>
    <LampDust :intensity="intensity" />
    <div class="bar-top__vignette"></div>
    <div class="bar-top__grain"></div>
  </div>
</template>
