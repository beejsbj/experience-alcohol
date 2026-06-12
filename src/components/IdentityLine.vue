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

    <!-- Weight: bare printed number, annotated by hand -->
    <span class="inline-flex items-baseline gap-0.5">
      <span v-if="!editingWeight" class="print text-sm cursor-pointer" @click="startWeightEdit">
        {{ person.weight }}
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
      <InkArrow :seed="`weight:${person.id}`" :width="24" :height="14" />
      <span class="scribble text-xs" style="color: var(--pen)">weight, kg</span>
    </span>

    <!-- Sex toggle: bare glyph, annotated -->
    <span class="inline-flex items-baseline gap-0.5">
      <button
        type="button"
        class="scribble text-lg leading-none"
        style="color: var(--pen)"
        :style="scatter(`sex:${person.id}`, { r: 6, x: 1, y: 1 })"
        :aria-label="`Toggle sex — currently ${person.gender}`"
        @click="toggleSex"
      >{{ person.gender === 'male' ? '♂' : '♀' }}</button>
      <InkArrow :seed="`sex-arrow:${person.id}`" :width="18" :height="12" />
      <span class="scribble text-xs" style="color: var(--pen)">sex</span>
    </span>

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
</template>
