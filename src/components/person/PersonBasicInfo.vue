<script setup>
import { ref } from "vue";
import { useAlcoholStore } from "../../stores/alcohol";

const store = useAlcoholStore();

const props = defineProps({
  person: {
    type: Object,
    required: true,
  },
});

const editingField = ref(false);
const editedPerson = ref({ ...props.person });

const startEditing = () => {
  editedPerson.value = { ...props.person };
  editingField.value = true;
};

const updateAndStopEditing = () => {
  store.updatePerson(editedPerson.value);
  editingField.value = false;
};
</script>

<template>
  <div class="space-y-2 flex-grow">
    <div
      v-if="!editingField"
      class="cursor-pointer"
      @click="startEditing('all')"
    >
      <h2 class="text-2xl font-bold">{{ person.name }}</h2>
      <div class="text-gray-600">
        {{ person.weight }}kg ·
        {{ person.gender.charAt(0).toUpperCase() + person.gender.slice(1) }}
      </div>
    </div>
    <div v-else class="space-y-2">
      <div class="flex gap-2 items-center">
        <input
          v-model="editedPerson.name"
          type="text"
          class="flex-grow text-2xl font-bold bg-white rounded-md border-gray-300 shadow-sm p-2 border"
          @blur="updateAndStopEditing"
          @keyup.enter="updateAndStopEditing"
        />
        <input
          v-model="editedPerson.color"
          type="color"
          class="h-10 w-14 bg-white rounded-md border-gray-300 shadow-sm p-1 border"
          @change="updateAndStopEditing"
        />
      </div>
      <div class="flex gap-2">
        <input
          v-model.number="editedPerson.weight"
          type="number"
          class="w-24 bg-white rounded-md border-gray-300 shadow-sm p-2 border"
          min="40"
          max="150"
          @blur="updateAndStopEditing"
          @keyup.enter="updateAndStopEditing"
        />
        <select
          v-model="editedPerson.gender"
          class="bg-white rounded-md border-gray-300 shadow-sm p-2 border"
          @change="updateAndStopEditing"
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>
    </div>
  </div>
</template>
