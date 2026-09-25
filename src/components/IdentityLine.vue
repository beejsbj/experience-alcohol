<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { scatter } from "../utils/scatter";
import WriteOn from "./WriteOn.vue";
import TallyStrokes from "./TallyStrokes.vue";

// Who this tab is for. The printer knows the seat; the bartender scrawls the
// name over it, and keeps a tally.
const props = defineProps({
  person: { type: Object, required: true },
  seat: { type: Number, default: 1 },
  pours: { type: Number, default: 0 },
});

const store = useSessionStore();

const editingWeight = ref(false);
const weightInput = ref(null);

const namePos = computed(() => scatter(`name-pos:${props.person.id}`, { r: 2.5, x: 3, y: 1 }));
const tallyPos = computed(() => scatter(`tally-pos:${props.person.id}`, { r: 4, x: 3, y: 2 }));

const toggleSex = () => {
  store.updatePerson(props.person.id, {
    gender: props.person.gender === "male" ? "female" : "male",
  });
};

const startWeightEdit = () => {
  editingWeight.value = true;
  setTimeout(() => weightInput.value?.focus(), 50);
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
  <div class="relative">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="print text-[9px]" style="letter-spacing: 0.24em; color: var(--print-soft)">
          GUEST {{ String(seat).padStart(2, "0") }}
        </p>
        <div class="mt-1.5 origin-left" :style="namePos">
          <WriteOn
            :model-value="person.name"
            :seed="`name:${person.id}`"
            placeholder="who's this?"
            class="pen--hard text-[60px] leading-[0.7]"
            @update:model-value="updateName"
          />
        </div>
      </div>

      <div class="flex shrink-0 flex-col items-end pt-0.5">
        <p class="print flex items-baseline gap-2 text-[12px]" style="letter-spacing: 0.08em">
          <button type="button" class="px-1" :aria-label="`Toggle sex — currently ${person.gender}`" @click="toggleSex">
            {{ person.gender === "male" ? "M" : "F" }}
          </button>
          <span v-if="!editingWeight" class="cursor-pointer" @click="startWeightEdit">{{ person.weight }}KG</span>
          <input
            v-else
            ref="weightInput"
            type="number"
            inputmode="numeric"
            :value="person.weight"
            min="30"
            max="250"
            class="print w-14 bg-transparent text-right outline-none"
            style="font-size: 16px; border-bottom: 1.5px solid var(--pen)"
            @change="updateWeight"
            @blur="editingWeight = false"
            @keydown.enter="editingWeight = false"
          />
        </p>
        <div v-if="pours" class="mt-2" :style="tallyPos">
          <TallyStrokes :count="pours" :seed="`total:${person.id}`" :size="22" color="var(--pen)" />
        </div>
      </div>
    </div>

  </div>
</template>
