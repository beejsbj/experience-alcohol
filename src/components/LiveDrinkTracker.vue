<script setup>
import { useAlcoholStore } from "../stores/alcohol";
import { useperson } from "../composables/useperson";
import PersonCard from "./person/PersonCard.vue";

const store = useAlcoholStore();
const { updatePerson } = useperson();

// Add a new person with default values
const addNewPerson = () => {
  store.addPerson();
};

// Reset all tracking
const resetAll = () => {
  store.resetAllTracking();
};
</script>

<style scoped>
.drink-button {
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.drink-button:hover {
  border-color: currentColor;
}
</style>

<template>
  <div class="p-6 bg-white rounded-lg shadow-lg">
    <h2 class="text-2xl font-bold mb-4">Live Drink Tracker</h2>

    <!-- People Management -->
    <div class="mb-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">People</h3>
        <button
          @click="addNewPerson()"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Add Person
        </button>
      </div>

      <!-- People List -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PersonCard
          v-for="person in store.people"
          :key="person.id"
          :person="person"
          :is-live="store.isLive"
          :can-remove="store.people.length > 1"
          :reference-person="store.people[0]"
          @remove="store.removePerson"
          @update="updatePerson"
        />
      </div>
    </div>

    <!-- Reset Button -->
    <div class="mt-6 flex justify-end">
      <button
        @click="resetAll"
        class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        Reset All Tracking
      </button>
    </div>
  </div>
</template>
