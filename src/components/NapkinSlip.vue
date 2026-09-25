<script setup>
import { computed, reactive, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { STRENGTHS, VESSELS } from "../constants";
import { triggerHaptic } from "../utils/haptics";
import { scatter, scatterRand } from "../utils/scatter";
import WriteOn from "./WriteOn.vue";
import VesselIcon from "./VesselIcon.vue";

// A house special, written on a cocktail napkin. Circle what it came in
// (that fills in a sensible pour and strength), circle a rough strength if
// it's stronger or weaker, give it a name if you like, and it joins the mat.
const props = defineProps({
  person: { type: Object, required: true },
});
const emit = defineEmits(["close"]);

const store = useSessionStore();
const name = ref("");
const vessel = ref("pint");
const form = reactive({ abvPercent: 5, volume: 16 });

const chooseVessel = (v) => {
  vessel.value = v.key;
  form.volume = v.volume;
  form.abvPercent = Math.round(v.abv * 1000) / 10;
  triggerHaptic("selection");
};

const chooseStrength = (s) => {
  form.abvPercent = s.abv;
  triggerHaptic("selection");
};

// A loose pen ring for whatever's circled.
const ring = (key, w = 60, h = 30) => {
  const rand = scatterRand(`napkin-ring:${props.person.id}:${key}`);
  const pts = [];
  const start = -2.2 + rand() * 0.6;
  for (let i = 0; i <= 26; i += 1) {
    const a = start + (i / 26) * Math.PI * 2.15;
    const k = 1 + (rand() * 2 - 1) * 0.05;
    pts.push(`${(w / 2 + Math.cos(a) * (w / 2 - 2) * k).toFixed(1)} ${(h / 2 + Math.sin(a) * (h / 2 - 2) * k).toFixed(1)}`);
  }
  return `M${pts.join(" L")}`;
};

// The numbers read as written-on, not typed-into: tap one to scratch a new one.
const editing = ref(null);
const abvInput = ref(null);
const volInput = ref(null);
const edit = (which) => {
  editing.value = which;
  setTimeout(() => (which === "abv" ? abvInput : volInput).value?.focus(), 50);
};

// No name? Call it what it came in; don't clash with one already on the mat.
const finalName = computed(() => {
  const typed = name.value.trim().toLowerCase();
  if (typed) return typed;
  const label = VESSELS.find((v) => v.key === vessel.value)?.label ?? "house special";
  const taken = new Set(store.session.customDrinks.map((d) => d.type));
  return taken.has(label) ? `${label} ${form.abvPercent}%` : label;
});

const save = () => {
  store.addCustomDrink({
    type: finalName.value,
    abv: Number(form.abvPercent) / 100,
    volume: Number(form.volume),
    vessel: vessel.value,
  });
  triggerHaptic("success");
  emit("close");
};
</script>

<template>
  <div class="pointer-events-auto fixed inset-0 z-[46]" @click.self="emit('close')">
    <div
      class="napkin absolute left-1/2 px-6 pb-5 pt-6"
      :style="{ ...scatter(`napkin:${person.id}`, { r: 2, x: 4, y: 2 }), bottom: 'calc(124px + env(safe-area-inset-bottom))', marginLeft: '-160px', '--pen': person.color }"
    >
      <p class="print text-center text-[9px]" style="letter-spacing: 0.4em; color: #8c7b62">HOUSE SPECIAL</p>

      <p class="pen mt-2 text-[22px]">what's it in?</p>
      <div class="mt-1 grid grid-cols-4 gap-y-1">
        <button
          v-for="v in VESSELS"
          :key="v.key"
          type="button"
          class="relative flex flex-col items-center py-1"
          :aria-pressed="vessel === v.key"
          @click="chooseVessel(v)"
        >
          <VesselIcon :vessel="v.key" :size="30" />
          <span class="pen whitespace-nowrap text-[16px] leading-none">{{ v.label }}</span>
          <svg v-if="vessel === v.key" class="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 60 60" preserveAspectRatio="none" aria-hidden="true">
            <path :d="ring(v.key, 60, 60)" fill="none" stroke="var(--pen)" stroke-width="1.6" vector-effect="non-scaling-stroke" style="animation: pen-draw 360ms ease-out both; --len: 300" pathLength="300" stroke-dasharray="300" />
          </svg>
        </button>
      </div>

      <p class="pen mt-3 flex flex-wrap items-baseline justify-center gap-1.5 text-[24px]">
        <span v-if="editing !== 'abv'" class="pen--hard cursor-pointer text-[32px]" @click="edit('abv')">{{ form.abvPercent }}</span>
        <input
          v-else
          ref="abvInput"
          v-model.number="form.abvPercent"
          type="number"
          inputmode="decimal"
          min="1"
          max="70"
          step="0.5"
          class="pen w-[2.2em] bg-transparent text-center outline-none"
          style="font-size: 30px"
          @blur="editing = null"
          @keydown.enter="editing = null"
        />
        <span>% strong,</span>
        <span v-if="editing !== 'vol'" class="pen--hard cursor-pointer text-[32px]" @click="edit('vol')">{{ form.volume }}</span>
        <input
          v-else
          ref="volInput"
          v-model.number="form.volume"
          type="number"
          inputmode="decimal"
          min="0.5"
          max="40"
          step="0.5"
          class="pen w-[2.2em] bg-transparent text-center outline-none"
          style="font-size: 30px"
          @blur="editing = null"
          @keydown.enter="editing = null"
        />
        <span>oz</span>
      </p>

      <!-- rough strengths to circle, printed like a menu -->
      <div class="mt-1 flex flex-wrap justify-center gap-x-2.5 gap-y-1">
        <button
          v-for="s in STRENGTHS"
          :key="s.label"
          type="button"
          class="print relative px-1.5 py-1 text-[9.5px]"
          style="letter-spacing: 0.14em; color: #6b5a44"
          @click="chooseStrength(s)"
        >
          {{ s.label.toUpperCase() }} {{ s.abv }}
          <svg v-if="form.abvPercent === s.abv" class="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 60 30" preserveAspectRatio="none" aria-hidden="true">
            <path :d="ring(s.label)" fill="none" stroke="var(--pen)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
          </svg>
        </button>
      </div>

      <div class="mt-3 min-h-[40px] text-center">
        <WriteOn v-model="name" :seed="`napkin-name:${person.id}`" :placeholder="`call it… (${finalName})`" class="text-[30px]" />
      </div>

      <div class="mt-3 flex justify-center">
        <button type="button" class="relative" style="transform: rotate(-3deg)" @click="save">
          <span class="pen pen--hard text-[32px]">put it on the mat →</span>
          <svg class="absolute -bottom-1.5 left-0 w-full overflow-visible" height="10" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true">
            <path d="M4 5 C 60 1, 140 2, 196 5" fill="none" stroke="var(--pen)" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.napkin {
  width: 320px;
  max-width: calc(100vw - 20px);
  background:
    radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, 0.7), transparent 60%),
    repeating-linear-gradient(45deg, rgba(120, 100, 70, 0.05) 0 2px, transparent 2px 6px),
    repeating-linear-gradient(-45deg, rgba(120, 100, 70, 0.05) 0 2px, transparent 2px 6px),
    #f4efe5;
  box-shadow:
    inset 0 0 0 10px #f4efe5,
    inset 0 0 0 11px rgba(140, 120, 90, 0.3),
    inset 0 0 0 14px #f4efe5,
    inset 0 0 0 15px rgba(140, 120, 90, 0.18),
    0 18px 40px rgba(0, 0, 0, 0.6);
  animation: scrap-in 260ms ease-out both;
}
</style>
