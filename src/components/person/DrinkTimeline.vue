<script setup>
import { ref, defineProps, computed } from "vue";
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

const isOpen = ref(false);
const { getPersonDrinkHistory } = usedrinks();

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
};

const drinkHistory = computed(() => getPersonDrinkHistory(props.personId));

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString();
};
</script>

<template>
  <div class="border rounded">
    <button
      @click="toggleOpen"
      class="w-full p-2 text-left flex justify-between items-center hover:bg-gray-50"
    >
      <span class="text-sm font-medium">Drink History</span>
      <span
        class="transform transition-transform"
        :class="{ 'rotate-180': isOpen }"
      >
        ▼
      </span>
    </button>
    <div v-show="isOpen" class="p-2 border-t">
      <div class="space-y-2 max-h-40 overflow-y-auto">
        <div
          v-for="(drink, index) in drinkHistory"
          :key="index"
          class="flex items-center gap-2 p-1 text-sm rounded"
          :style="{ backgroundColor: personColor + '10' }"
        >
          <img :src="drink.icon" :alt="drink.type" class="w-4 h-4" />
          <span>{{ drink.type }}</span>
          <span class="text-gray-500 ml-auto text-xs">{{
            formatTime(drink.timestamp)
          }}</span>
        </div>
        <div
          v-if="!drinkHistory.length"
          class="text-gray-500 text-center text-sm py-2"
        >
          No drinks logged yet
        </div>
      </div>
    </div>
  </div>
</template>
