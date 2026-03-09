<script setup>
import { ref } from "vue";
import { useAlcoholStore } from "../../stores/alcohol";
import { triggerHaptic } from "../../utils/haptics";

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
  triggerHaptic("success");
};

const cancelEditing = () => {
  editedPerson.value = { ...props.person };
  editingField.value = false;
};
</script>

<template>
  <div class="flex-grow space-y-2">
    <div v-if="!editingField" class="space-y-1.5">
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1">
          <p class="surface-label">Person {{ person.id }}</p>
          <h2 class="text-lg font-semibold tracking-tight text-[color:var(--ink)] sm:text-xl">
            {{ person.name }}
          </h2>
          <div class="text-xs text-[color:var(--muted)]">
            {{ person.weight }}kg ·
            {{ person.gender.charAt(0).toUpperCase() + person.gender.slice(1) }}
          </div>
        </div>

        <button class="secondary-button" @click="startEditing">
          Edit
        </button>
      </div>
    </div>

    <div v-else class="tracker-panel tracker-panel--soft space-y-2.5">
      <div class="grid gap-2.5">
        <label class="space-y-2">
          <span class="surface-label">Display name</span>
          <input
            v-model="editedPerson.name"
            type="text"
            class="field-input"
            placeholder="Name"
          />
        </label>

        <div class="grid grid-cols-[1fr_auto] gap-2.5">
          <label class="space-y-2">
            <span class="surface-label">Weight (kg)</span>
            <input
              v-model.number="editedPerson.weight"
              type="number"
              class="field-input"
              min="40"
              max="150"
            />
          </label>

          <label class="space-y-2">
            <span class="surface-label">Accent</span>
            <input
              v-model="editedPerson.color"
              type="color"
              class="h-10 w-full min-w-[3.5rem] rounded-2xl border border-[color:var(--line)] bg-white/70 p-1"
            />
          </label>
        </div>

        <label class="space-y-2">
          <span class="surface-label">Gender constant</span>
          <select v-model="editedPerson.gender" class="field-input">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="primary-button" @click="updateAndStopEditing">
          Save
        </button>
        <button class="secondary-button" @click="cancelEditing">
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>
