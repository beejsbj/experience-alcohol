<script setup>
import { computed } from "vue";
import { scatter } from "../utils/scatter";

const props = defineProps({
  verdict: { type: String, required: true },
});

const tone = computed(() => {
  if (props.verdict === "CUT OFF" || props.verdict === "SLOW DOWN") return "var(--redpen)";
  if (props.verdict === "EASY NOW") return "#8a6d1c";
  if (props.verdict === "ON PACE") return "var(--greenink)";
  return "var(--print)";
});

const tiltStyle = computed(() => {
  const { transform } = scatter(props.verdict, { r: 4, x: 0, y: 0 });
  return { transform };
});
</script>

<template>
  <Transition name="thump" mode="out-in">
    <span :key="verdict" class="stamp print" :style="{ color: tone, ...tiltStyle }">
      {{ verdict }}
    </span>
  </Transition>
</template>
