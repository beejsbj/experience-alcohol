<script setup>
import { ref } from "vue";

const show = ref(false);
const errors = ref([]);

const open = (errorList) => {
  errors.value = errorList;
  show.value = true;
};

const close = () => {
  show.value = false;
  errors.value = [];
};

defineExpose({ open, close });
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
      >
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-semibold text-red-600">
            BAC Calculation Validation Errors
          </h3>
          <button @click="close" class="text-gray-400 hover:text-gray-600">
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div class="space-y-4">
          <div
            v-for="(error, index) in errors"
            :key="index"
            class="p-3 bg-red-50 rounded"
          >
            <p class="whitespace-pre-wrap text-red-700">{{ error }}</p>
          </div>
        </div>
        <div class="mt-6 flex justify-end">
          <button
            @click="close"
            class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
