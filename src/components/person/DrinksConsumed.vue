<script setup>
import { defineProps } from "vue";
import { usedrinks } from "../../composables/usedrinks";

const props = defineProps({
  personId: {
    type: String,
    required: true,
  },
});

const { drinks, getDrinkCount } = usedrinks();
</script>

<template>
  <div class="bg-gray-50 p-4 rounded-lg">
    <h3 class="font-semibold text-gray-800 mb-2">Drinks Consumed</h3>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div
        v-for="drink in drinks"
        :key="drink.type"
        class="flex items-center gap-2 bg-white p-2 rounded"
      >
        <img :src="drink.icon" :alt="drink.type" class="w-5 h-5" />
        <span class="font-medium">{{
          getDrinkCount(personId, drink.type)
        }}</span>
        <span class="text-sm text-gray-600">{{ drink.type }}</span>
      </div>
    </div>
  </div>
</template>
