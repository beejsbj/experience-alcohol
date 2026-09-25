<script setup>
import { computed } from "vue";
import { scatterRand } from "../utils/scatter";

// A rubber stamp slammed onto the paper in the person's ink. Uneven inking
// comes from the grit mask; the tilt is seeded per verdict so a given
// verdict always lands the same way.
const props = defineProps({
  verdict: { type: String, required: true },
  size: { type: Number, default: 13 },
});

const tilt = computed(() => {
  const rand = scatterRand(`stamp:${props.verdict}`);
  return `${(-3 - rand() * 7).toFixed(1)}deg`;
});
</script>

<template>
  <span
    :key="verdict"
    class="stamp"
    :style="{
      color: 'var(--pen)',
      fontSize: `${size}px`,
      '--tilt': tilt,
      transform: `rotate(${tilt})`,
      animation: 'stamp-thump 360ms cubic-bezier(.3,1.4,.5,1) both',
    }"
  >{{ verdict }}</span>
</template>
