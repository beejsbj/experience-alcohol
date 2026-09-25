<script setup>
// What the drink comes in, drawn side-on in pen on the napkin.
defineProps({
  vessel: { type: String, required: true },
  size: { type: Number, default: 34 },
});

const PATHS = {
  pint: ["M9 5 L25 5 L23 30 L11 30 Z", "M10 11 L24 11", "M13 8 Q15 6 17 8 Q19 6 21 8"],
  mug: ["M6 7 L22 7 L22 30 L6 30 Z", "M22 11 C 30 11, 30 24, 22 24", "M10 12 L10 26", "M14 12 L14 26", "M18 12 L18 26"],
  can: ["M9 6 Q9 4 11 4 L23 4 Q25 4 25 6 L25 29 Q25 31 23 31 L11 31 Q9 31 9 29 Z", "M9 8 L25 8", "M9 27 L25 27", "M14 15 L20 15 L20 21 L14 21 Z"],
  bottle: ["M15 2 L19 2 L19 9 Q25 13 25 18 L25 31 L9 31 L9 18 Q9 13 15 9 Z", "M9 20 L25 20", "M9 27 L25 27"],
  wine: ["M9 4 L25 4 Q27 16 17 19 Q7 16 9 4 Z", "M17 19 L17 29", "M11 31 L23 31", "M10 10 Q17 12 24 10"],
  flute: ["M13 3 L21 3 Q22 15 17 20 Q12 15 13 3 Z", "M17 20 L17 29", "M12 31 L22 31", "M16 8 L16 8.5", "M18 12 L18 12.5", "M16 15 L16 15.5"],
  highball: ["M10 4 L24 4 L23 31 L11 31 Z", "M20 1 L16 20", "M12 10 L22 10", "M14 16 L18 16 L18 20 L14 20 Z"],
  rocks: ["M7 12 L27 12 L25 30 L9 30 Z", "M11 17 L17 17 L17 23 L11 23 Z", "M17 20 L23 20 L23 26 L17 26 Z"],
};
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 34 34" class="overflow-visible" aria-hidden="true">
    <path
      v-for="(d, i) in PATHS[vessel] || PATHS.rocks"
      :key="i"
      :d="d"
      fill="none"
      stroke="var(--pen)"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
