<script setup>
import { ref } from "vue";
import { useSessionStore } from "../stores/session";
import { scatter } from "../utils/scatter";
import WriteOn from "./WriteOn.vue";
import InkArrow from "./InkArrow.vue";
import ColorScribble from "./ColorScribble.vue";

const props = defineProps({
  person: { type: Object, required: true },
});

const store = useSessionStore();

const editingWeight = ref(false);
const weightInput = ref(null);

// Each field is hand-placed: a seeded offset + tilt, positioned absolutely so
// the name's length never drags the weight or its arrow out of true.
const namePos = scatter(`name-pos:${props.person.id}`, { r: 2.5, x: 4, y: 3 });
const sexPos = scatter(`sex-pos:${props.person.id}`, { r: 7, x: 3, y: 2 });
const weightPos = scatter(`weight-pos:${props.person.id}`, { r: 2, x: 4, y: 3 });
const weightNotePos = scatter(`weight-note:${props.person.id}`, { r: 3, x: 4, y: 3 });

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
</script>

<template>
  <div class="relative" style="height: 150px">
    <!-- Ink color scribble + sex glyph cluster, top-right corner -->
    <ColorScribble :person="person" />
    <button
      type="button"
      class="scribble absolute text-xl leading-none"
      style="top: 4px; right: 46px; color: var(--pen)"
      :style="{ ...sexPos, top: '4px', right: '46px' }"
      :aria-label="`Toggle sex — currently ${person.gender}`"
      @click="toggleSex"
    >{{ person.gender === 'male' ? '♂' : '♀' }}</button>

    <!-- Name: the loudest thing on the paper -->
    <div
      class="absolute"
      style="top: 4px; left: 2px; max-width: 64%"
      :style="{ ...namePos, top: '4px', left: '2px', maxWidth: '64%' }"
    >
      <WriteOn
        :model-value="person.name"
        :seed="`name:${person.id}`"
        placeholder="who's this?"
        :color="person.color"
        class="text-4xl font-bold leading-none"
        @update:model-value="updateName"
      />
    </div>

    <!-- Weight: bare printed number, hand-placed below the name -->
    <div
      class="absolute"
      style="top: 86px; left: 6px"
      :style="{ ...weightPos, top: '86px', left: '6px' }"
    >
      <span v-if="!editingWeight" class="print text-lg cursor-pointer" @click="startWeightEdit">
        {{ person.weight }}
      </span>
      <input
        v-else
        ref="weightInput"
        type="number"
        :value="person.weight"
        min="30"
        max="250"
        class="print text-lg w-16 bg-transparent border-b border-[var(--pen)] outline-none"
        style="font-size: 16px"
        @change="updateWeight"
        @blur="commitWeight"
        @keydown.enter="commitWeight"
      />
    </div>

    <!-- Weight margin note: arrow hooks back left toward the bare number -->
    <div
      class="absolute flex items-center gap-1"
      style="top: 84px; left: 64px"
      :style="{ ...weightNotePos, top: '84px', left: '64px' }"
    >
      <InkArrow :seed="`weight:${person.id}`" dir="left" :width="32" :height="20" />
      <span class="scribble text-base" style="color: var(--pen)">weight, kg</span>
    </div>
  </div>
</template>
