<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime } from "../utils/bac";
import { CUTOFF_BAC, feelingFor, nextPourMinutes, stampFor, targetDetails } from "../utils/feelings";
import { DRINKS, MAINTAINABLE_STATES } from "../constants";
import { triggerHaptic } from "../utils/haptics";
import GlassMeter from "./GlassMeter.vue";
import StampVerdict from "./StampVerdict.vue";

const props = defineProps({
  person: { type: Object, required: true },
});

const store = useSessionStore();
const now = useLiveNow();
const vibeMenuOpen = ref(false);

const events = computed(() => store.eventsFor(props.person.id));
const bac = computed(() => calculateBACAtTime(events.value, props.person, now.value));
const rising = computed(
  () => bac.value > calculateBACAtTime(events.value, props.person, now.value - 60000) + 0.00001
);
const feeling = computed(() => feelingFor(bac.value));
const stamp = computed(() => stampFor(bac.value, props.person.pinnedState));
const target = computed(() => targetDetails(props.person.pinnedState));
const cutOff = computed(() => bac.value >= CUTOFF_BAC);

const pourCopy = computed(() => {
  if (cutOff.value) return "no more tonight — water + a friend keeping watch";
  const minutes = nextPourMinutes(bac.value, props.person, DRINKS[0], props.person.pinnedState);
  if (minutes <= 0) return "next pour: whenever you like";
  const at = new Date(now.value + minutes * 60000);
  const hh = at.getHours().toString().padStart(2, "0");
  const mm = at.getMinutes().toString().padStart(2, "0");
  return `next pour ok ${hh}:${mm}`;
});

const timeLabel = computed(() =>
  new Date(now.value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
);

const pinState = (stateName) => {
  store.pinVibe(props.person.id, stateName);
  vibeMenuOpen.value = false;
  triggerHaptic("selection");
};
</script>

<template>
  <section class="card wob-a relative p-4">
    <p class="eyebrow print">feeling · {{ timeLabel }}</p>
    <div class="mt-1 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="announce feeling-word">{{ feeling.state.toLowerCase() }}</h2>
        <svg class="-mt-1" width="110" height="12" viewBox="0 0 110 12" aria-hidden="true">
          <path
            d="M4 8 C 26 3, 60 2, 106 6 C 70 6, 28 8, 7 11"
            fill="none"
            stroke="var(--redpen)"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
        <p class="print mt-2 text-[11px] leading-4" style="color: var(--faded)">
          {{ feeling.description }}
        </p>
        <p class="print mt-3 text-lg font-bold">
          {{ bac.toFixed(3) }}%
          <span class="text-[10px] font-normal" style="color: var(--faded)">
            est. · {{ rising ? "climbing" : "drifting down" }}
          </span>
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <StampVerdict :verdict="stamp" />
          <span class="print text-[11px]">{{ pourCopy }}</span>
        </div>
      </div>
      <GlassMeter :bac="bac" :target="target" :rising="rising" class="w-[68px] shrink-0" />
    </div>

    <div class="relative mt-3">
      <button type="button" class="scribble vibe-button" @click="vibeMenuOpen = !vibeMenuOpen">
        <template v-if="!target">pin a vibe for tonight ↴</template>
        <template v-else>holding: {{ target.state.toLowerCase() }} ↴</template>
      </button>
      <div v-if="vibeMenuOpen" class="card wob-c vibe-menu p-2">
        <button
          v-for="option in MAINTAINABLE_STATES"
          :key="option.state"
          type="button"
          class="vibe-option print"
          @click="pinState(option.state)"
        >
          <span class="announce text-[0.85rem]">{{ option.state.toLowerCase() }}</span>
          <span style="color: var(--faded)">
            {{ option.minBAC.toFixed(2) }}–{{ option.maxBAC.toFixed(2) }}%
          </span>
        </button>
        <button
          v-if="target"
          type="button"
          class="vibe-option print"
          style="color: var(--redpen)"
          @click="pinState(null)"
        >
          unpin — free pour
        </button>
      </div>
    </div>
  </section>
</template>
