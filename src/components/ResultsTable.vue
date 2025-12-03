<script setup>
import { DRINK_TYPES, FEELING_STATES } from "../constants/index";
import { useAlcoholStore } from "../stores/alcohol";

const store = useAlcoholStore();

const getInitialDrinksDescription = (person, state) => {
  if (store.isLive) {
    const tracking = store.liveDrinkTracking[person.id];
    if (!tracking) return "No drinks logged";

    const currentBAC = tracking.currentBAC;
    if (currentBAC >= state.minBAC && currentBAC <= state.maxBAC) {
      return `Currently in this state\nBAC: ${currentBAC.toFixed(3)}%`;
    }
    return `BAC: ${currentBAC.toFixed(3)}%`;
  }

  const avgBAC = (state.minBAC + state.maxBAC) / 2;
  const drinksNeeded = store.recommendedDrinksForTarget(person, avgBAC);

  if (drinksNeeded <= 0) return "N/A";
  return `${Math.round(drinksNeeded * 10) / 10} in first hour`;
};

const getMaintenanceDescription = (person, state) => {
  if (store.isLive) {
    const tracking = store.liveDrinkTracking[person.id];
    if (!tracking || !tracking.drinkHistory.length) return "No drinks logged";

    return `${
      tracking.drinkHistory.length
    } drinks consumed\nLast drink: ${formatLastDrink(tracking.drinkHistory)}`;
  }

  const avgBAC = (state.minBAC + state.maxBAC) / 2;
  if (avgBAC >= 0.16) {
    return "NOT RECOMMENDED";
  }

  const drinksNeeded = store.recommendedDrinksForTarget(person, avgBAC);
  const maintenanceDrinks = 1; // Assume 1 drink per hour for maintenance
  const totalDrinks = Math.round(
    drinksNeeded + maintenanceDrinks * (store.timeRange - 1)
  );

  return `~${totalDrinks} total (start with ${Math.round(
    drinksNeeded
  )}, then ~${maintenanceDrinks}/hour)`;
};

const formatLastDrink = (drinkHistory) => {
  if (!drinkHistory.length) return "";
  const lastDrink = drinkHistory[drinkHistory.length - 1];
  const minutes = Math.round(
    (Date.now() - new Date(lastDrink.timestamp)) / (1000 * 60)
  );
  return minutes <= 1 ? "just now" : `${minutes} mins ago`;
};
</script>

<template>
  <div class="mb-6 overflow-x-auto">
    <h2 class="text-xl font-semibold mb-2">Alcohol Effects by Feeling State</h2>
    <table class="min-w-full bg-white border border-gray-200">
      <thead>
        <tr class="bg-gray-100">
          <th class="py-2 px-4 border">Feeling State</th>
          <th class="py-2 px-4 border">BAC Range</th>
          <th class="py-2 px-4 border">How It Feels</th>
          <template v-for="person in store.people" :key="person.id">
            <th class="py-2 px-4 border">
              Person {{ person.id }} ({{ person.weight }}kg)<br />
              {{ DRINK_TYPES[store.drinkType].name }}s<br />
              Per Hour to Reach
            </th>
            <th class="py-2 px-4 border">
              Maintaining This<br />
              Level Over {{ store.timeRange }} Hours
            </th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(state, index) in FEELING_STATES"
          :key="index"
          :class="index % 2 === 0 ? 'bg-gray-50' : 'bg-white'"
        >
          <td class="py-2 px-4 border font-medium">{{ state.state }}</td>
          <td class="py-2 px-4 border">
            {{ state.minBAC.toFixed(2) }}-{{ state.maxBAC.toFixed(2) }}%
          </td>
          <td class="py-2 px-4 border">{{ state.description }}</td>
          <template v-for="person in store.people" :key="person.id">
            <td class="py-2 px-4 border whitespace-pre-line">
              {{ getInitialDrinksDescription(person, state) }}
            </td>
            <td class="py-2 px-4 border whitespace-pre-line">
              {{ getMaintenanceDescription(person, state) }}
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
