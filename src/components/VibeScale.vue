<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { MAINTAINABLE_STATES } from "../constants";
import { scatterRand } from "../utils/scatter";
import { triggerHaptic } from "../utils/haptics";

// The vibes you can hold, printed as a line of options. Holding one is a pen
// circle round the word; tap it again and the circle's gone — free pour.
const props = defineProps({
  person: { type: Object, required: true },
});

const store = useSessionStore();
const SHORT = { "Barely Noticeable": "BARELY", "Pleasantly Relaxed": "RELAXED", "Definitely Tipsy": "TIPSY" };
const justCircled = ref(null);

const options = computed(() =>
  MAINTAINABLE_STATES.map((s) => {
    const rand = scatterRand(`circle:${props.person.id}:${s.state}`);
    // An open hand-drawn loop that overshoots where it started.
    const pts = [];
    const start = -2.4 + rand() * 0.6;
    for (let i = 0; i <= 32; i += 1) {
      const a = start + (i / 32) * Math.PI * 2.18;
      const wob = 1 + (rand() * 2 - 1) * 0.045;
      pts.push(`${(50 + Math.cos(a) * 46 * wob).toFixed(1)} ${(20 + Math.sin(a) * 15 * wob).toFixed(1)}`);
    }
    return {
      state: s.state,
      word: SHORT[s.state] ?? s.state.toUpperCase(),
      held: props.person.pinnedState === s.state,
      loop: `M${pts.join(" L")}`,
      tilt: (rand() * 2 - 1) * 5,
    };
  })
);

const toggle = (option) => {
  const next = option.held ? null : option.state;
  justCircled.value = next;
  store.pinVibe(props.person.id, next);
  triggerHaptic("selection");
};
</script>

<template>
  <div class="relative flex items-center justify-between px-1" role="radiogroup" aria-label="Vibe to hold tonight">
    <button
      v-for="option in options"
      :key="option.state"
      type="button"
      role="radio"
      :aria-checked="option.held"
      class="relative flex-1 py-2.5 text-center"
      @click="toggle(option)"
    >
      <span class="print text-[11px]" style="letter-spacing: 0.18em" :style="{ fontWeight: option.held ? 700 : 420 }">{{ option.word }}</span>
      <svg
        v-if="option.held"
        class="pointer-events-none absolute left-1/2 top-1/2 overflow-visible"
        width="100"
        height="40"
        viewBox="0 0 100 40"
        :style="{ transform: `translate(-50%, -50%) rotate(${option.tilt}deg)` }"
        aria-hidden="true"
      >
        <path
          :d="option.loop"
          fill="none"
          stroke="var(--pen)"
          stroke-width="1.7"
          stroke-linecap="round"
          pathLength="400"
          stroke-dasharray="400"
          :style="justCircled === option.state ? 'animation: pen-draw 420ms ease-out both; --len: 400' : ''"
        />
      </svg>
    </button>
  </div>
</template>
