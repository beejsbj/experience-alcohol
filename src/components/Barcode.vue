<script setup>
import { computed } from "vue";
import { barcode } from "../utils/paper";

const props = defineProps({
  seed: { type: String, required: true },
  height: { type: Number, default: 30 },
});

const code = computed(() => barcode(props.seed));
</script>

<template>
  <div class="flex flex-col items-center" aria-hidden="true">
    <svg
      :viewBox="`0 0 ${code.width} 10`"
      :height="height"
      preserveAspectRatio="none"
      style="width: 72%"
    >
      <rect v-for="(bar, i) in code.bars" :key="i" :x="bar.x" y="0" :width="bar.w" height="10" fill="var(--print)" />
    </svg>
    <p class="print mt-1 text-[9px]" style="letter-spacing: 0.42em; color: var(--print-soft)">{{ code.digits }}</p>
  </div>
</template>
