<script setup>
import { computed, reactive } from "vue";
import { useSessionStore } from "../stores/session";
import { PERSON_COLORS } from "../constants";
import { triggerHaptic } from "../utils/haptics";

const props = defineProps({
  person: { type: Object, default: null },
});
const emit = defineEmits(["close"]);
const store = useSessionStore();

const form = reactive({
  name: props.person?.name ?? "",
  weight: props.person?.weight ?? 78,
  gender: props.person?.gender ?? "male",
  color: props.person?.color ?? PERSON_COLORS[store.activePeople.length % PERSON_COLORS.length],
});

const canRemove = computed(() => props.person && store.activePeople.length > 1);

const save = () => {
  const name = form.name.trim();
  if (props.person) {
    store.updatePerson(props.person.id, { ...form, name: name || props.person.name });
  } else {
    store.addPerson(name ? { ...form, name } : { ...form, name: undefined });
  }
  triggerHaptic("success");
  emit("close");
};

const remove = () => {
  store.deactivatePerson(props.person.id);
  triggerHaptic("warning");
  emit("close");
};
</script>

<template>
  <div class="card wob-b p-3">
    <p class="eyebrow print">{{ person ? "edit drinker" : "new drinker" }}</p>
    <div class="mt-2 grid grid-cols-2 gap-2">
      <label class="block">
        <span class="scribble field-label">name</span>
        <input v-model="form.name" type="text" class="field print" placeholder="who?" />
      </label>
      <label class="block">
        <span class="scribble field-label">weight (kg)</span>
        <input v-model.number="form.weight" type="number" min="40" max="180" class="field print" />
      </label>
    </div>
    <label class="mt-2 block">
      <span class="scribble field-label">body constant</span>
      <select v-model="form.gender" class="field print">
        <option value="male">male (0.68)</option>
        <option value="female">female (0.55)</option>
      </select>
    </label>
    <div class="mt-2">
      <span class="scribble field-label">ink color</span>
      <div class="mt-1 flex gap-2">
        <button
          v-for="swatch in PERSON_COLORS"
          :key="swatch"
          type="button"
          class="swatch wob-d"
          :class="{ 'swatch--active': form.color === swatch }"
          :style="{ backgroundColor: swatch }"
          :aria-label="`Ink color ${swatch}`"
          @click="form.color = swatch"
        ></button>
      </div>
    </div>
    <div class="mt-3 flex items-center gap-3">
      <button type="button" class="stamp stamp--ink print tilt-2" @click="save">SAVE</button>
      <button
        type="button"
        class="print text-[11px] underline"
        style="color: var(--faded)"
        @click="emit('close')"
      >
        never mind
      </button>
      <button
        v-if="canRemove"
        type="button"
        class="print ml-auto text-[11px] underline"
        style="color: var(--redpen)"
        @click="remove"
      >
        left the bar
      </button>
    </div>
  </div>
</template>
