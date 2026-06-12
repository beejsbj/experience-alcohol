<script setup>
import { computed, reactive, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime } from "../utils/bac";
import { CUTOFF_BAC, nextPourMinutes } from "../utils/feelings";
import { DRINKS } from "../constants";
import { triggerHaptic } from "../utils/haptics";
import { scatter } from "../utils/scatter";
import TallyStrokes from "./TallyStrokes.vue";
import WriteOn from "./WriteOn.vue";

const props = defineProps({
  person: { type: Object, required: true },
});

const store = useSessionStore();
const now = useLiveNow();
const showCustomSlip = ref(false);
const customForm = reactive({ type: "", abvPercent: 8, volume: 6 });
const customWriteOn = ref("");

const drinks = computed(() => [...DRINKS, ...store.session.customDrinks]);
const bac = computed(() =>
  calculateBACAtTime(store.eventsFor(props.person.id), props.person, now.value)
);

const countFor = (type) =>
  store.eventsFor(props.person.id).filter((e) => e.type === type).length;

// Minutes until ready for a drink; null = cut off; 0 = ready
const waitFor = (drink) => {
  if (bac.value >= CUTOFF_BAC) return null;
  return nextPourMinutes(bac.value, props.person, drink, props.person.pinnedState);
};

const isReady = (drink) => {
  const m = waitFor(drink);
  return m !== null && m <= 0;
};

// --cd fraction: remaining / some reference (max 90 min total per spec simplification)
const cdFraction = (drink) => {
  const m = waitFor(drink);
  if (m === null || m <= 0) return 0;
  return Math.min(1, m / 90);
};

const waitLabel = (drink) => {
  const m = waitFor(drink);
  if (m === null) return "WATER";
  if (m <= 0) return "POUR!";
  return "DRYING";
};

const timeLeft = (drink) => {
  const m = waitFor(drink);
  if (m === null || m <= 0) return "";
  return m < 60 ? `${Math.ceil(m)}m` : `${Math.ceil(m / 60)}h`;
};

const pour = (drink) => {
  const m = waitFor(drink);
  if (m !== null && m > 0) {
    triggerHaptic("warning");
  } else {
    triggerHaptic("tap");
  }
  store.logDrink(props.person.id, drink);
};

const saveCustom = () => {
  const name = (customWriteOn.value || customForm.type).trim().toLowerCase();
  if (!name) return;
  store.addCustomDrink({
    type: name,
    abv: Number(customForm.abvPercent) / 100,
    volume: Number(customForm.volume),
  });
  customWriteOn.value = "";
  customForm.type = "";
  showCustomSlip.value = false;
  triggerHaptic("success");
};
</script>

<template>
  <div class="px-2">
    <!-- Pour tiles grid -->
    <div class="grid gap-2" :style="{ gridTemplateColumns: `repeat(${Math.min(drinks.length + 1, 5)}, 1fr)` }">
      <div v-for="drink in drinks" :key="drink.type" class="flex flex-col items-center gap-1">
        <div class="w-full" :style="scatter(`stick:${person.id}:${drink.type}`, { r: 3, x: 1, y: 1 })">
          <button
            type="button"
            class="sticker w-full"
            :class="{ 'sticker--drying': !isReady(drink) && waitFor(drink) !== null && waitFor(drink) > 0 }"
            :style="{ '--cd': cdFraction(drink) }"
            :aria-label="`Log ${drink.type}`"
            @click="pour(drink)"
          >
            <div v-if="!isReady(drink) && waitFor(drink) !== null && waitFor(drink) > 0" class="sticker__hatch"></div>

            <!-- Doodled SVG icon -->
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <!-- beer mug -->
              <template v-if="drink.type === 'beer'">
                <path d="M5 7 L5 22 Q5 24 7 24 L17 24 Q19 24 19 22 L19 7 Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M19 10 L22 10 Q24.5 10 24.5 13.5 Q24.5 17 22 17 L19 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                <line x1="8" y1="7" x2="8" y2="4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <line x1="12" y1="7" x2="11" y2="4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <line x1="16" y1="7" x2="16" y2="5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </template>
              <!-- wine glass -->
              <template v-else-if="drink.type === 'wine'">
                <path d="M8 4 L20 4 C20 4 22 12 14 16 C6 12 8 4 8 4 Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="14" y1="16" x2="14" y2="22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                <line x1="10" y1="22" x2="18" y2="22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </template>
              <!-- cocktail / martini -->
              <template v-else-if="drink.type === 'cocktail'">
                <path d="M6 5 L22 5 L14 16 Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="14" y1="16" x2="14" y2="22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                <line x1="10" y1="22" x2="18" y2="22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                <circle cx="20" cy="4" r="2" stroke="currentColor" stroke-width="1.4"/>
              </template>
              <!-- shot glass -->
              <template v-else-if="drink.type === 'shot'">
                <path d="M9 5 L19 5 L18 22 L10 22 Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </template>
              <!-- custom flask -->
              <template v-else>
                <path d="M10 5 L10 9 L6 16 Q5 20 8 22 L20 22 Q23 20 22 16 L18 9 L18 5 Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="8" y1="5" x2="20" y2="5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                <line x1="9" y1="7" x2="19" y2="7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </template>
            </svg>

            <span class="sticker__label">{{ waitLabel(drink) }}</span>
            <span v-if="timeLeft(drink)" class="print" style="font-size: 8px">{{ timeLeft(drink) }}</span>
          </button>
        </div>

        <TallyStrokes :count="countFor(drink.type)" :seed="`tally:${person.id}:${drink.type}`" />
        <span class="print text-[9px]" style="color: var(--faded)">{{ drink.type }}</span>
      </div>

      <!-- + own tile -->
      <div class="flex flex-col items-center gap-1">
        <button
          type="button"
          class="sticker sticker--ghost w-full"
          style="font-family: 'Caveat', cursive; font-size: 0.85rem"
          :class="{ 'border-[var(--pen)]': showCustomSlip }"
          aria-label="Add a custom drink"
          @click="showCustomSlip = !showCustomSlip"
        >
          + own
        </button>
      </div>
    </div>

    <!-- Custom drink paper scrap -->
    <div
      v-if="showCustomSlip"
      class="mt-3 p-3"
      style="background: var(--paper-shade); border: 1.5px solid var(--faded); border-radius: 4px;"
    >
      <p class="print text-[10px] tracking-widest mb-2" style="color: var(--faded)">HOUSE SPECIAL</p>
      <div class="flex flex-col gap-2">
        <div>
          <p class="print text-[9px] mb-0.5" style="color: var(--faded)">name it</p>
          <WriteOn
            v-model="customWriteOn"
            :seed="`custom-name:${person.id}`"
            placeholder="name it…"
            class="text-lg"
          />
        </div>
        <div class="flex gap-3">
          <div>
            <p class="print text-[9px] mb-0.5" style="color: var(--faded)">abv %</p>
            <input
              v-model.number="customForm.abvPercent"
              type="number"
              min="1"
              max="70"
              step="0.5"
              class="print w-16 text-sm bg-transparent border-b border-[var(--faded)] outline-none"
              placeholder="8"
            />
          </div>
          <div>
            <p class="print text-[9px] mb-0.5" style="color: var(--faded)">oz</p>
            <input
              v-model.number="customForm.volume"
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              class="print w-16 text-sm bg-transparent border-b border-[var(--faded)] outline-none"
              placeholder="6"
            />
          </div>
        </div>
        <p class="scribble text-[11px]" style="color: var(--faded)">1 oz ≈ 30 ml</p>
        <button
          type="button"
          class="stamp print self-start"
          @click="saveCustom"
        >
          ADD IT
        </button>
      </div>
    </div>
  </div>
</template>
