<script setup>
import { computed } from "vue";
import { scatter } from "../utils/scatter";

const props = defineProps({
  verdict: { type: String, required: true },
});

// One ink on the paper: the verdict stamps in the person's chosen pen.
// Emphasis comes from the words themselves, not a second colour.
const tone = computed(() => "var(--pen)");

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
