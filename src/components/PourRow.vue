<script setup>
import { computed, reactive, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime } from "../utils/bac";
import { CUTOFF_BAC, nextPourMinutes } from "../utils/feelings";
import { DRINKS } from "../constants";
import { triggerHaptic } from "../utils/haptics";
import TallyMarks from "./TallyMarks.vue";

const props = defineProps({
  person: { type: Object, required: true },
});

const store = useSessionStore();
const now = useLiveNow();
const showCustomSlip = ref(false);
const customForm = reactive({ type: "", abvPercent: 8, volume: 6 });

const drinks = computed(() => [...DRINKS, ...store.session.customDrinks]);
const bac = computed(() =>
  calculateBACAtTime(store.eventsFor(props.person.id), props.person, now.value)
);

const countFor = (type) =>
  store.eventsFor(props.person.id).filter((event) => event.type === type).length;

const waitFor = (drink) => {
  if (bac.value >= CUTOFF_BAC) return null;
  return nextPourMinutes(bac.value, props.person, drink, props.person.pinnedState);
};

const waitLabel = (drink) => {
  const minutes = waitFor(drink);
  if (minutes === null) return "water";
  if (minutes <= 0) return "ready";
  return minutes < 60 ? `wait ${Math.ceil(minutes)}m` : `wait ${Math.ceil(minutes / 60)}h`;
};

const isReady = (drink) => {
  const minutes = waitFor(drink);
  return minutes !== null && minutes <= 0;
};

const pour = (drink) => {
  store.logDrink(props.person.id, drink);
  triggerHaptic("tap");
};

const saveCustom = () => {
  const name = customForm.type.trim().toLowerCase();
  if (!name) return;
  store.addCustomDrink({
    type: name,
    abv: Number(customForm.abvPercent) / 100,
    volume: Number(customForm.volume),
  });
  customForm.type = "";
  showCustomSlip.value = false;
  triggerHaptic("success");
};
</script>

<template>
  <section>
    <div class="grid grid-cols-5 gap-2">
      <div v-for="(drink, index) in drinks" :key="drink.type" class="text-center">
        <button
          type="button"
          class="pour-button announce wob-d"
          :class="[`tilt-${index % 4}`, { 'pour-button--ready': isReady(drink) }]"
          :aria-label="`Log ${drink.type} for ${person.name}`"
          @click="pour(drink)"
        >
          {{ drink.type.length > 6 ? drink.type.slice(0, 5) + "…" : drink.type }}
        </button>
        <TallyMarks :count="countFor(drink.type)" class="mt-1" />
        <p
          class="print mt-0.5 text-[9px]"
          :style="{ color: isReady(drink) ? 'var(--burnt)' : 'var(--faded)' }"
        >
          {{ waitLabel(drink) }}
        </p>
      </div>
      <div class="text-center">
        <button
          type="button"
          class="pour-button pour-button--own scribble wob-d tilt-2"
          aria-label="Add a custom drink type"
          @click="showCustomSlip = !showCustomSlip"
        >
          + own
        </button>
      </div>
    </div>

    <div v-if="showCustomSlip" class="card wob-c mt-3 p-3">
      <p class="eyebrow print">house special</p>
      <div class="mt-2 grid grid-cols-[1.4fr_1fr_1fr] gap-2">
        <input v-model="customForm.type" type="text" class="field print" placeholder="name it" />
        <input
          v-model.number="customForm.abvPercent"
          type="number"
          min="1"
          max="70"
          step="0.5"
          class="field print"
          placeholder="abv %"
        />
        <input
          v-model.number="customForm.volume"
          type="number"
          min="0.5"
          max="24"
          step="0.5"
          class="field print"
          placeholder="oz"
        />
      </div>
      <p class="scribble mt-1 text-[12px]" style="color: var(--faded)">1 oz ≈ 30 ml</p>
      <button type="button" class="stamp stamp--ink print tilt-1 mt-2" @click="saveCustom">
        ADD IT
      </button>
    </div>
  </section>
</template>
