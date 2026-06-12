<script setup>
import { ref } from "vue";
import { useSessionStore } from "../stores/session";
import { PERSON_COLORS } from "../constants";
import { scatter } from "../utils/scatter";
import WriteOn from "./WriteOn.vue";

const props = defineProps({
  person: { type: Object, required: true },
});

const store = useSessionStore();

const editingWeight = ref(false);
const weightInput = ref(null);

const lineStyle = scatter(`identity:${props.person.id}`, { r: 1.5, x: 5, y: 2 });

const toggleSex = () => {
  store.updatePerson(props.person.id, {
    gender: props.person.gender === "male" ? "female" : "male",
  });
};

const startWeightEdit = () => {
  editingWeight.value = true;
  setTimeout(() => weightInput.value?.focus(), 50);
};

const commitWeight = () => {
  editingWeight.value = false;
};

const updateWeight = (e) => {
  const v = Number(e.target.value);
  if (v > 20 && v < 300) store.updatePerson(props.person.id, { weight: v });
};

const updateName = (name) => {
  store.updatePerson(props.person.id, { name });
};

const setColor = (color) => {
  store.updatePerson(props.person.id, { color });
};

const canDeactivate = () => store.activePeople.length > 1;

const deactivate = () => {
  if (canDeactivate()) store.deactivatePerson(props.person.id);
};
</script>

<template>
  <div class="flex items-baseline flex-wrap gap-x-2 gap-y-1" :style="lineStyle">
    <!-- Name write-on -->
    <WriteOn
      :model-value="person.name"
      :seed="`name:${person.id}`"
      placeholder="who's this?"
      :color="person.color"
      class="text-xl font-bold"
      @update:model-value="updateName"
    />

    <span class="scribble text-base" style="color: var(--faded)">·</span>

    <!-- Weight (tap to edit) -->
    <span v-if="!editingWeight" class="print text-sm cursor-pointer" @click="startWeightEdit">
      {{ person.weight }}kg
    </span>
    <input
      v-else
      ref="weightInput"
      type="number"
      :value="person.weight"
      min="30"
      max="250"
      class="print text-sm w-14 bg-transparent border-b border-[var(--pen)] outline-none"
      style="font-size: 14px"
      @change="updateWeight"
      @blur="commitWeight"
      @keydown.enter="commitWeight"
    />

    <!-- Sex toggle (scribbled circle) -->
    <button
      type="button"
      class="scribble text-base leading-none"
      style="color: var(--pen)"
      :aria-label="`Toggle sex — currently ${person.gender}`"
      @click="toggleSex"
    >
      <span
        style="display:inline-block;border: 1.5px solid var(--pen); border-radius: 50%; padding: 0 3px; line-height: 1.4;"
      >{{ person.gender === 'male' ? '♂' : '♀' }}</span>
    </button>

    <!-- Ink color blots -->
    <span class="flex items-center gap-1 ml-1">
      <button
        v-for="color in PERSON_COLORS"
        :key="color"
        type="button"
        class="ink-blot"
        :class="{ 'ink-blot--active': person.color === color }"
        :style="{ background: color }"
        :aria-label="`Set ink color ${color}`"
        @click="setColor(color)"
      ></button>
    </span>

    <!-- "left the bar" deactivate link -->
    <button
      v-if="canDeactivate()"
      type="button"
      class="scribble text-[11px] ml-auto"
      style="color: var(--redpen)"
      @click="deactivate"
    >
      left the bar
    </button>
  </div>
</template>
