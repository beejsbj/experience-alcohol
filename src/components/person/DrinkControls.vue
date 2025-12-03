<script setup>
import { defineProps } from "vue";
import { usedrinks } from "../../composables/usedrinks";

const props = defineProps({
  personId: {
    type: Number,
    required: true,
  },
  personColor: {
    type: String,
    required: true,
  },
});

const { drinks, getDrinkCount, addDrink, getNextDrinkTime, getNextDrinkClass } =
  usedrinks();

const handleAddDrink = (drink) => {
  addDrink(drink, { id: props.personId });
};
</script>

<template>
  <div>
    <p class="text-sm font-medium mb-2">Add Drinks:</p>
    <div class="grid grid-cols-2 gap-2">
      <div
        v-for="drink in drinks"
        :key="drink.type"
        class="relative rounded-lg overflow-hidden"
      >
        <button
          @click="handleAddDrink(drink)"
          :style="{ backgroundColor: personColor + '40' }"
          class="w-full p-2 flex flex-col items-center transition-colors hover:opacity-80"
        >
          <img :src="drink.icon" :alt="drink.type" class="w-6 h-6 mb-1" />
          <span class="text-xs">{{ drink.type }}</span>
          <span class="text-xs"
            >({{ getDrinkCount(personId, drink.type) }})</span
          >
        </button>
        <div
          class="text-xs p-1 text-center"
          :class="getNextDrinkClass(personId, drink)"
        >
          {{ getNextDrinkTime(personId, drink) }}
        </div>
      </div>
    </div>
  </div>
</template>
