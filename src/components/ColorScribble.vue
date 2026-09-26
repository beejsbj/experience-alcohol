<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { PERSON_COLORS } from "../constants";
import { scatterRand } from "../utils/scatter";
import { triggerHaptic } from "../utils/haptics";

// Where the bartender tested the pen. Tap it to grab the next pen off the
// bar — every mark on the receipt switches to that ink.
const props = defineProps({
  person: { type: Object, required: true },
  inline: { type: Boolean, default: false }, // sit in the flow instead of the corner
});
const store = useSessionStore();
const redrawn = ref(0);

const squiggle = computed(() => {
  const rand = scatterRand(`pen-test:${props.person.id}:${props.person.color}`);
  let d = `M3 ${14 + rand() * 4}`;
  let x = 3;
  while (x < 40) {
    const nx = x + 4 + rand() * 3;
    d += ` Q${(x + nx) / 2} ${rand() > 0.5 ? 2 + rand() * 4 : 18 + rand() * 4} ${nx.toFixed(1)} ${(8 + rand() * 8).toFixed(1)}`;
    x = nx;
  }
  return d;
});

const nextPen = () => {
  const i = PERSON_COLORS.indexOf(props.person.color);
  store.updatePerson(props.person.id, { color: PERSON_COLORS[(i + 1) % PERSON_COLORS.length] });
  redrawn.value += 1;
  triggerHaptic("selection");
};
</script>

<template>
  <button
    type="button"
    class="z-10 p-2"
    :class="inline ? 'relative' : 'absolute'"
    :style="inline ? 'transform: rotate(-4deg)' : 'top: 6px; right: 6px; transform: rotate(-8deg)'"
    aria-label="Grab a different pen"
    @click.stop="nextPen"
  >
    <svg width="44" height="24" viewBox="0 0 44 24" aria-hidden="true" class="overflow-visible">
      <path
        :key="redrawn"
        :d="squiggle"
        fill="none"
        :stroke="person.color"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        pathLength="300"
        stroke-dasharray="300"
        :style="redrawn ? 'animation: pen-draw 380ms ease-out both; --len: 300' : ''"
      />
    </svg>
  </button>
</template>
