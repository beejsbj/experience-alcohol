<script setup>
import { computed } from "vue";

const props = defineProps({
  verdict: { type: String, required: true },
});

const tone = computed(() => {
  if (props.verdict === "CUT OFF") return "var(--redpen)";
  if (props.verdict === "ON PACE") return "var(--burnt)";
  return "var(--pen)";
});

const tilt = computed(
  () =>
    ({ "ON PACE": "tilt-1", "EASY NOW": "tilt-2", "SLOW DOWN": "tilt-3", "CUT OFF": "tilt-1" })[
      props.verdict
    ] || "tilt-1"
);
</script>

<template>
  <Transition name="thump" mode="out-in">
    <span :key="verdict" class="stamp print" :class="tilt" :style="{ color: tone }">
      {{ verdict }}
    </span>
  </Transition>
</template>
