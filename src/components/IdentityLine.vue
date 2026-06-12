<script setup>
import { ref } from "vue";
import { useSessionStore } from "../stores/session";
import { scatter } from "../utils/scatter";
import WriteOn from "./WriteOn.vue";
import InkArrow from "./InkArrow.vue";

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

const canDeactivate = () => store.activePeople.length > 1;

const deactivate = () => {
  if (canDeactivate()) store.deactivatePerson(props.person.id);
};
</script>

<template>
  <div :style="lineStyle">
    <div class="flex items-baseline flex-wrap gap-x-3 gap-y-1">
      <!-- Name write-on -->
      <WriteOn
        :model-value="person.name"
        :seed="`name:${person.id}`"
        placeholder="who's this?"
        :color="person.color"
        class="text-3xl font-bold"
        @update:model-value="updateName"
      />

      <!-- Sex toggle: bare glyph, self-explanatory -->
      <button
        type="button"
        class="scribble text-xl leading-none"
        style="color: var(--pen)"
        :style="scatter(`sex:${person.id}`, { r: 6, x: 1, y: 1 })"
        :aria-label="`Toggle sex — currently ${person.gender}`"
        @click="toggleSex"
      >{{ person.gender === 'male' ? '♂' : '♀' }}</button>

      <!-- Weight: bare printed number -->
      <span v-if="!editingWeight" class="print text-base cursor-pointer" @click="startWeightEdit">
        {{ person.weight }}
      </span>
      <input
        v-else
        ref="weightInput"
        type="number"
        :value="person.weight"
        min="30"
        max="250"
        class="print text-base w-14 bg-transparent border-b border-[var(--pen)] outline-none"
        style="font-size: 16px"
        @change="updateWeight"
        @blur="commitWeight"
        @keydown.enter="commitWeight"
      />

      <!-- "left the bar" deactivate link -->
      <button
        v-if="canDeactivate()"
        type="button"
        class="scribble text-[10px] ml-auto"
        style="color: var(--redpen); opacity: 0.75"
        @click="deactivate"
      >
        left the bar
      </button>
    </div>

    <!-- Floating margin note: arrow hooks up toward the bare number -->
    <div
      class="flex items-start gap-1"
      style="margin-left: 32%; margin-top: -4px"
      :style="scatter(`weight-note:${person.id}`, { r: 3, x: 6, y: 2 })"
    >
      <InkArrow :seed="`weight:${person.id}`" dir="right" :width="30" :height="22" />
      <span class="scribble text-sm" style="color: var(--pen); margin-top: 6px">weight, kg</span>
    </div>
  </div>
</template>
