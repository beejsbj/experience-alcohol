<script setup>
import { useAlcoholStore } from "./stores/alcohol";
import DrinkSelection from "./components/DrinkSelection.vue";
import BACChart from "./components/BACChart.vue";
import ResultsTable from "./components/ResultsTable.vue";
import ImportantNotes from "./components/ImportantNotes.vue";
import ValidationDialog from "./components/ValidationDialog.vue";
import LiveDrinkTracker from "./components/LiveDrinkTracker.vue";
import { onMounted, ref } from "vue";

const store = useAlcoholStore();
const validationDialog = ref(null);
</script>

<template>
  <div class="p-4 max-w-6xl mx-auto bg-gray-50 rounded-lg shadow">
    <h1 class="text-2xl font-bold mb-4 text-center">
      Interactive Alcohol Experience Calculator
    </h1>

    <!-- Live Tracker Section -->
    <div class="mb-8">
      <LiveDrinkTracker />
    </div>

    <!-- Simulation Controls -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <DrinkSelection v-model:drinkType="store.drinkType" />
      <div class="p-4 bg-white rounded shadow">
        <h2 class="text-lg font-semibold mb-2">Time Range</h2>
        <div class="mb-2">
          <label class="block text-sm font-medium text-gray-700"
            >Hours to simulate</label
          >
          <input
            type="number"
            v-model.number="store.timeRange"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            min="1"
            max="24"
            :disabled="store.isLive"
          />
        </div>
        <!-- Live Mode Toggle -->
        <div class="mt-4 flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700"
            >Live Tracking Mode</label
          >
          <button
            @click="store.toggleLiveMode()"
            class="px-3 py-1 rounded-lg transition-colors"
            :class="{
              'bg-green-500 text-white': store.isLive,
              'bg-gray-200 text-gray-700': !store.isLive,
            }"
          >
            {{ store.isLive ? "Live" : "Simulation" }}
          </button>
        </div>
        <p class="mt-2 text-sm text-gray-500">
          {{
            store.isLive
              ? "Using real-time drink tracking data"
              : "Using simulated drink data"
          }}
        </p>
      </div>
    </div>

    <BACChart />
    <ResultsTable />
    <ImportantNotes />
  </div>
</template>
