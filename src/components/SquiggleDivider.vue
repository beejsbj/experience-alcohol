<script setup>
const props = defineProps({
  seed: { type: Number, default: 1 },
});

let d = "M4 4";
for (let x = 14; x <= 296; x += 10) {
  d += ` Q ${x - 5} ${(4 + Math.sin((x + props.seed * 37) / 9) * 2.6).toFixed(2)} ${x} 4`;
}
const path = d;
</script>

<template>
  <svg class="w-full" height="8" preserveAspectRatio="none" viewBox="0 0 300 8" aria-hidden="true">
    <path
      :d="path"
      fill="none"
      stroke="var(--line)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-dasharray="6 5"
    />
  </svg>
</template>
