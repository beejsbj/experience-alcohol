<script setup>
import { ref } from "vue";
import { useSessionStore } from "../stores/session";
import { triggerHaptic } from "../utils/haptics";
import PersonSlip from "./PersonSlip.vue";

const store = useSessionStore();
const editingPerson = ref(null);
const addingPerson = ref(false);

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLowerCase() ?? "")
    .join("") || "?";

const tapAvatar = (person) => {
  if (store.focusedPersonId === person.id) {
    editingPerson.value = person;
    addingPerson.value = false;
  } else {
    store.setFocus(person.id);
    triggerHaptic("selection");
  }
};

const openAdd = () => {
  addingPerson.value = true;
  editingPerson.value = null;
};

const closeSlip = () => {
  addingPerson.value = false;
  editingPerson.value = null;
};
</script>

<template>
  <header>
    <p class="eyebrow print">your tab</p>
    <div class="flex items-end justify-between gap-3">
      <input
        v-model="store.session.nickname"
        class="scribble nickname-input"
        aria-label="Session nickname"
        maxlength="40"
      />
      <div class="flex shrink-0 items-center pl-2">
        <button
          v-for="(person, index) in store.activePeople"
          :key="person.id"
          type="button"
          class="avatar scribble"
          :class="[`tilt-${index % 4}`, { 'avatar--focused': person.id === store.focusedPersonId }]"
          :style="{ backgroundColor: person.color }"
          :aria-label="
            person.id === store.focusedPersonId
              ? `Edit ${person.name}`
              : `Switch to ${person.name}`
          "
          @click="tapAvatar(person)"
        >
          {{ initials(person.name) }}
        </button>
        <button
          type="button"
          class="avatar avatar--add scribble tilt-2"
          aria-label="Add person"
          @click="openAdd"
        >
          +
        </button>
      </div>
    </div>
    <p class="scribble text-[13px] leading-none" style="color: var(--faded)">
      tap your bubble twice to edit · + for a friend
    </p>
    <PersonSlip
      v-if="addingPerson || editingPerson"
      :key="editingPerson?.id ?? 'new'"
      :person="editingPerson"
      class="mt-3"
      @close="closeSlip"
    />
  </header>
</template>
