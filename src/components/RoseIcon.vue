<script setup>
import { computed } from "vue";
import { polar } from "../utils/dial";
import { windowModel } from "../utils/window";

// A person's window at thumbnail size: too small for tracery, so just the hub —
// a quatrefoil lit in whatever they're drinking now, their initial on the boss.
const props = defineProps({
  person: { type: Object, required: true },
  events: { type: Array, required: true },
  now: { type: Number, required: true },
});

const model = computed(() => windowModel(props.events, props.person, { now: props.now }));
const glass = computed(() => (model.value.bac > 0 ? model.value.glass : null));
const initial = computed(() => (props.person.name?.trim()?.[0] ?? "?").toUpperCase());
const foils = [0, 1, 2, 3].map((i) => polar(50, 50, 19, (i / 4) * Math.PI * 2 + Math.PI / 4));
</script>

<template>
  <svg viewBox="0 0 100 100" class="icon" aria-hidden="true">
    <circle cx="50" cy="50" r="48" class="icon__stone" />
    <circle
      v-for="(f, i) in foils"
      :key="i"
      :cx="f.x"
      :cy="f.y"
      r="17"
      :fill="glass || '#221c2c'"
      class="icon__foil"
    />
    <circle cx="50" cy="50" r="15" class="icon__boss" />
    <text x="50" y="51" class="icon__initial">{{ initial }}</text>
  </svg>
</template>

<style scoped>
.icon {
  display: block;
  width: 100%;
  height: 100%;
}
.icon__stone {
  fill: var(--stone);
  stroke: var(--lead);
  stroke-width: 4;
}
.icon__foil {
  stroke: var(--lead);
  stroke-width: 5;
  transition: fill 500ms ease;
}
.icon__boss {
  fill: var(--bone);
  stroke: var(--lead);
  stroke-width: 4;
}
.icon__initial {
  fill: var(--lead);
  font-family: var(--font-slab);
  font-size: 21px;
  text-anchor: middle;
  dominant-baseline: central;
}
</style>
