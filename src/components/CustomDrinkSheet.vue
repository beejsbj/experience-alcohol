<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { GLASS } from "../utils/window";
import { triggerHaptic } from "../utils/haptics";

const props = defineProps({ person: { type: Object, required: true } });
const emit = defineEmits(["close"]);
const store = useSessionStore();

const name = ref("");
const strength = ref(12); // % abv
const ml = ref(150);

const OZ = 29.57;
const clean = computed(() => name.value.trim().toLowerCase());

const nudge = (which, delta) => {
  triggerHaptic("selection");
  if (which === "strength") strength.value = Math.min(80, Math.max(1, strength.value + delta));
  else ml.value = Math.min(1000, Math.max(10, ml.value + delta));
};

const pour = () => {
  if (!clean.value) return;
  const drink = { type: clean.value, abv: strength.value / 100, volume: ml.value / OZ };
  store.addCustomDrink(drink);
  store.logDrink(props.person.id, drink);
  triggerHaptic("tap");
  emit("close");
};
</script>

<template>
  <div class="sheet" role="dialog" aria-label="Pour something else" @click.self="emit('close')">
    <p class="plate plate--dark slab text-lg"><span>pour something else</span></p>

    <label class="mt-10 block">
      <span class="mono text-[11px] tracking-[0.2em]" style="color: var(--bone-3)">WHAT IS IT</span>
      <input
        v-model="name"
        class="bare-input display mt-1 text-5xl"
        placeholder="arak, sake…"
        autocomplete="off"
        autofocus
        @keydown.enter="pour"
      />
    </label>

    <div class="mt-10 grid grid-cols-2 gap-6">
      <div v-for="field in [
        { key: 'strength', label: 'STRENGTH', value: strength, unit: '%', step: 1 },
        { key: 'ml', label: 'HOW MUCH', value: ml, unit: 'ml', step: 10 },
      ]" :key="field.key">
        <span class="mono text-[11px] tracking-[0.2em]" style="color: var(--bone-3)">{{ field.label }}</span>
        <div class="mt-1 flex items-baseline gap-3">
          <button type="button" class="nudge slab" @click="nudge(field.key, -field.step)">−</button>
          <span class="slab text-5xl">{{ field.value }}</span>
          <span class="mono text-sm" style="color: var(--bone-2)">{{ field.unit }}</span>
          <button type="button" class="nudge slab" @click="nudge(field.key, field.step)">+</button>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="plate slab mt-14 text-3xl"
      :style="{ background: GLASS.custom, color: 'var(--bone)', opacity: clean ? 1 : 0.4 }"
      @click="pour"
    ><span>pour it</span></button>

    <button type="button" class="mono mt-8 block text-xs underline" style="color: var(--bone-2)" @click="emit('close')">
      never mind
    </button>
  </div>
</template>

<style scoped>
.nudge {
  background: none;
  border: 0;
  color: var(--gold);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 2rem;
  width: 2rem;
  line-height: 1;
}
</style>
