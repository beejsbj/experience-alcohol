<script setup>
import { reactive, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { triggerHaptic } from "../utils/haptics";
import { scatter } from "../utils/scatter";
import WriteOn from "./WriteOn.vue";

// A house special, written on a cocktail napkin. Name it, scrawl how strong
// and how big, and it joins the glasses on the mat.
const props = defineProps({
  person: { type: Object, required: true },
});
const emit = defineEmits(["close"]);

const store = useSessionStore();
const name = ref("");
const form = reactive({ abvPercent: 8, volume: 6 });

// The numbers read as written-on, not typed-into: tap one to scratch a new one.
const editing = ref(null);
const abvInput = ref(null);
const volInput = ref(null);
const edit = (which) => {
  editing.value = which;
  setTimeout(() => (which === "abv" ? abvInput : volInput).value?.focus(), 50);
};

const save = () => {
  const type = name.value.trim().toLowerCase();
  if (!type) return;
  store.addCustomDrink({
    type,
    abv: Number(form.abvPercent) / 100,
    volume: Number(form.volume),
  });
  triggerHaptic("success");
  emit("close");
};
</script>

<template>
  <div class="pointer-events-auto fixed inset-0 z-[46]" @click.self="emit('close')">
    <div
      class="napkin absolute left-1/2 px-7 pb-6 pt-7"
      :style="{ ...scatter(`napkin:${person.id}`, { r: 2.5, x: 4, y: 2 }), bottom: 'calc(124px + env(safe-area-inset-bottom))', marginLeft: '-150px', '--pen': person.color }"
    >
      <p class="print text-center text-[9px]" style="letter-spacing: 0.4em; color: #8c7b62">HOUSE SPECIAL</p>
      <div class="mt-4 min-h-[48px] text-center">
        <WriteOn v-model="name" :seed="`napkin-name:${person.id}`" placeholder="name it…" class="text-[40px]" />
      </div>

      <p class="pen mt-4 flex flex-wrap items-baseline justify-center gap-1.5 text-[26px]">
        <span v-if="editing !== 'abv'" class="pen--hard cursor-pointer text-[34px]" @click="edit('abv')">{{ form.abvPercent }}</span>
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
        <span v-if="editing !== 'vol'" class="pen--hard cursor-pointer text-[34px]" @click="edit('vol')">{{ form.volume }}</span>
        <input
          v-else
          ref="volInput"
          v-model.number="form.volume"
          type="number"
          inputmode="decimal"
          min="0.5"
          max="24"
          step="0.5"
          class="pen w-[2.2em] bg-transparent text-center outline-none"
          style="font-size: 30px"
          @blur="editing = null"
          @keydown.enter="editing = null"
        />
        <span>oz</span>
      </p>
      <p class="pen mt-1 text-center text-[18px] leading-tight" style="opacity: 0.6">tap a number to change it<br />1 oz ≈ 30 ml</p>

      <div class="mt-5 flex justify-center">
        <button type="button" class="stamp text-[13px]" style="color: var(--pen); transform: rotate(-4deg)" :style="{ opacity: name.trim() ? 0.9 : 0.35 }" @click="save">
          ON THE MAT
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.napkin {
  width: 300px;
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
