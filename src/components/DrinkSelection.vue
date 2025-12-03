<script setup>
import { DRINK_TYPES } from "../constants/index";
import { useAlcoholStore } from "../stores/alcohol";

const store = useAlcoholStore();

defineProps({
  drinkType: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <div class="p-4 bg-white rounded shadow">
    <h2 class="text-lg font-semibold mb-2">Drink Selection</h2>
    <div class="mb-2">
      <label class="block text-sm font-medium text-gray-700">Drink Type</label>
      <select
        :value="drinkType"
        @change="store.setDrinkType($event.target.value)"
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
      >
        <option v-for="(drink, key) in DRINK_TYPES" :key="key" :value="key">
          {{ drink.name }}
        </option>
      </select>
    </div>
    <div class="text-sm text-gray-600 mt-2">
      <p>Standard serving: {{ DRINK_TYPES[drinkType].oz }} oz</p>
      <p>
        Alcohol content:
        {{ DRINK_TYPES[drinkType].alcoholPercentage * 100 }}%
      </p>
    </div>
  </div>
</template>
