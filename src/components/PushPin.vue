<script setup>
defineProps({ animate: { type: Boolean, default: true } });
</script>

<template>
  <svg
    width="22"
    height="26"
    viewBox="0 0 22 26"
    aria-hidden="true"
    :style="animate ? 'animation: pin-drop 320ms cubic-bezier(0.3, 1.4, 0.5, 1) both' : ''"
  >
    <rect x="10" y="12" width="2.2" height="11" rx="1" fill="#8a1c13" transform="rotate(6 11 12)" />
    <circle cx="11" cy="7" r="6" fill="var(--redpen)" />
    <circle cx="9" cy="5" r="2" fill="#e8766b" />
  </svg>
</template>
