<script setup>
import { defineProps } from "vue";
import { usedrinks } from "../../composables/usedrinks";
import { useperson } from "../../composables/useperson";

const props = defineProps({
  personId: {
    type: String,
    required: true,
  },
  maintainBAC: {
    type: Number,
    default: null,
  },
  currentBAC: {
    type: Number,
    required: true,
  },
});

const {
  getCurrentFeelingState,
  getRecommendation,
  getBACColorClass,
  getMaintainanceAdvice,
  setMaintainLevel,
  clearMaintainLevel,
} = useperson();
</script>

<template>
  <div class="space-y-3 bg-gray-50 p-4 rounded-lg">
    <div class="space-y-1">
      <div class="flex items-baseline gap-2">
        <span class="text-gray-600 text-sm">Current BAC:</span>
        <span :class="[getBACColorClass(currentBAC), 'text-2xl font-bold']">
          {{ (currentBAC * 100).toFixed(3) }}%
        </span>
      </div>
      <div class="text-lg">{{ getCurrentFeelingState(personId) }}</div>
    </div>

    <!-- Recommendations -->
    <div class="border-t border-gray-200 pt-3">
      <h3 class="font-semibold text-gray-800 mb-1">Recommendation:</h3>
      <p class="text-gray-700">{{ getRecommendation(personId) }}</p>
      <p v-if="maintainBAC" class="text-gray-700 mt-1">
        {{ getMaintainanceAdvice(personId) }}
      </p>
    </div>

    <!-- Maintain Button -->
    <div class="flex items-center gap-2">
      <button
        v-if="!maintainBAC"
        @click="setMaintainLevel({ id: personId })"
        class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        :disabled="currentBAC === 0"
      >
        Maintain This Level
      </button>
      <button
        v-else
        @click="clearMaintainLevel({ id: personId })"
        class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        Stop Maintaining
      </button>
      <span v-if="maintainBAC" class="text-sm text-gray-600">
        Target: {{ (maintainBAC * 100).toFixed(3) }}%
      </span>
    </div>
  </div>
</template>
