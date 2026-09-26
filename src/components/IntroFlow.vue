<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { scatter, scatterRand } from "../utils/scatter";
import { triggerHaptic } from "../utils/haptics";
import WriteOn from "./WriteOn.vue";
import SexGlyph from "./SexGlyph.vue";
import WeightRuler from "./WeightRuler.vue";
import ColorScribble from "./ColorScribble.vue";

// A fresh receipt asks before it assumes. Someone at the table writes the
// questions down the paper one at a time; the answers go in underneath.
const props = defineProps({
  person: { type: Object, required: true },
  seat: { type: Number, default: 1 },
});

const store = useSessionStore();
const step = ref(0);
const name = ref(props.person.name ?? "");
const gender = ref(null);
const weight = ref(props.person.weight || 70);
const nameEl = ref(null);

const tilt = (key, r = 2) => scatter(`intro:${key}:${props.person.id}`, { r, x: 3, y: 1 });

const loops = computed(() => {
  const mk = (key) => {
    const rand = scatterRand(`intro-loop:${props.person.id}:${key}`);
    const pts = [];
    const start = -2.2 + rand() * 0.5;
    for (let i = 0; i <= 30; i += 1) {
      const a = start + (i / 30) * Math.PI * 2.16;
      const w = 1 + (rand() * 2 - 1) * 0.05;
      pts.push(`${(60 + Math.cos(a) * 56 * w).toFixed(1)} ${(34 + Math.sin(a) * 30 * w).toFixed(1)}`);
    }
    return `M${pts.join(" L")}`;
  };
  return { female: mk("female"), male: mk("male") };
});

const lbs = computed(() => Math.round(weight.value * 2.20462));

const nameDone = () => {
  if (step.value === 0) step.value = 1;
};

const pick = (g) => {
  gender.value = g;
  triggerHaptic("selection");
  if (step.value < 2) setTimeout(() => (step.value = 2), 260);
};

const cheers = () => {
  store.introduce(props.person.id, { name: name.value, gender: gender.value ?? "male", weight: weight.value });
  triggerHaptic("success");
};

onMounted(() => {
  if (store.focusedPersonId === props.person.id) nextTick(() => nameEl.value?.focus());
});
</script>

<template>
  <section class="relative mt-3">
    <p class="print text-[9px]" style="letter-spacing: 0.24em; color: var(--print-soft)">
      GUEST {{ String(seat).padStart(2, "0") }} · NEW TAB
    </p>

    <!-- 1. who -->
    <p class="pen mt-3 text-[26px]" :style="tilt('q1')">who's this tab for?</p>
    <div class="relative mt-1 min-h-[62px]">
      <WriteOn
        ref="nameEl"
        v-model="name"
        :seed="`name:${person.id}`"
        placeholder="write a name…"
        class="pen--hard text-[58px] leading-[0.9]"
        @done="nameDone"
      />
      <div class="rule--dots absolute inset-x-0 bottom-0"></div>
    </div>
    <button
      v-if="step === 0"
      type="button"
      class="pen mt-3 text-[24px]"
      @click="nameDone"
    >
      {{ name.trim() ? "that's them" : "skip name" }} ↓
    </button>

    <!-- 2. body, for the math -->
    <template v-if="step >= 1">
      <p class="pen mt-6 text-[26px]" :style="tilt('q2')">for the math — which body?</p>
      <div class="mt-1 flex items-center justify-around">
        <button
          v-for="g in ['female', 'male']"
          :key="g"
          type="button"
          class="relative flex items-center gap-2 px-4 py-3"
          :aria-pressed="gender === g"
          @click="pick(g)"
        >
          <SexGlyph :kind="g" :seed="String(person.id)" :size="30" />
          <span class="pen text-[30px]">{{ g }}</span>
          <svg
            v-if="gender === g"
            class="pointer-events-none absolute left-1/2 top-1/2 overflow-visible"
            width="120"
            height="68"
            viewBox="0 0 120 68"
            style="transform: translate(-50%, -50%) rotate(-3deg)"
            aria-hidden="true"
          >
            <path :d="loops[g]" fill="none" stroke="var(--pen)" stroke-width="1.8" stroke-linecap="round" pathLength="400" stroke-dasharray="400" style="animation: pen-draw 420ms ease-out both; --len: 400" />
          </svg>
        </button>
      </div>
      <p class="print mt-1 text-center text-[8.5px]" style="letter-spacing: 0.16em; color: var(--print-soft)">
        BODY WATER CHANGES HOW ALCOHOL HITS<br />
        SHARED TABLES SEND YOUR ANSWERS TO OTHER PHONES
      </p>
    </template>

    <!-- 3. weight, and a pen for the night -->
    <template v-if="step >= 2">
      <p class="pen mt-6 text-[26px]" :style="tilt('q3')">roughly how heavy?</p>
      <div class="mt-1 flex items-baseline gap-2">
        <span class="pen pen--hard text-[58px] leading-none">{{ weight }}</span>
        <span class="pen text-[28px]">kg</span>
        <span class="print ml-auto text-[10px]" style="letter-spacing: 0.14em; color: var(--print-soft)">≈ {{ lbs }} LB</span>
      </div>
      <WeightRuler v-model="weight" class="mt-1" />

      <div class="mt-6 flex items-center gap-2 whitespace-nowrap">
        <p class="pen text-[24px]">your pen:</p>
        <ColorScribble :person="person" inline />
        <p class="pen text-[18px]" style="opacity: 0.55">← tap for another</p>
      </div>

      <div class="mt-7 flex justify-end">
        <button type="button" class="relative pr-2" @click="cheers">
          <span class="pen pen--hard text-[48px]">cheers →</span>
          <svg class="absolute -bottom-2 left-0 w-full overflow-visible" height="12" viewBox="0 0 160 12" preserveAspectRatio="none" aria-hidden="true">
            <path d="M4 7 C 50 2, 110 3, 156 6 C 110 8, 60 9, 20 11" fill="none" stroke="var(--pen)" stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </template>
  </section>
</template>
