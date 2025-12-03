import { defineStore } from "pinia";
import { DRINK_TYPES, BAC_CONSTANTS } from "../constants";
import { ref, computed } from "vue";
import { calculateCurrentBAC, calculateDrinksForBAC } from "../utils/bac";

export const useAlcoholStore = defineStore("alcohol", () => {
  // State
  const people = ref([
    {
      id: 1,
      name: "Person 1",
      weight: 78,
      gender: "male",
      drinksPerHour: 1,
      targetBAC: 0.05,
      color: "#8884d8", // Default color for first person
      maintainBAC: null, // Target BAC to maintain
      lastMaintainTime: null, // When the maintain button was last pressed
    },
  ]);
  const drinkType = ref("beer");
  const compareWeights = ref(false);
  const compareDrinks = ref(false);
  const timeRange = ref(6); // hours to simulate
  const liveDrinkTracking = ref({}); // Map of personId to their drink history and current state
  const isLive = ref(false); // Whether to use live tracking data

  // Getters
  const recommendedDrinksForTarget = computed(() => {
    return (person, targetBAC) => {
      const drink = DRINK_TYPES[drinkType.value];
      return calculateDrinksForBAC(
        targetBAC,
        person.weight,
        person.gender,
        drink.alcoholPercentage,
        drink.oz
      );
    };
  });

  // Actions
  function addPerson(person) {
    const newId = Math.max(0, ...people.value.map((p) => p.id)) + 1;
    people.value.push({ ...person, id: newId });
    resetPersonTracking(newId);
  }

  function updatePerson(updates) {
    const index = people.value.findIndex((p) => p.id === updates.id);
    if (index !== -1) {
      people.value[index] = { ...people.value[index], ...updates };
      updatePersonBAC(updates.id);
    }
  }

  function removePerson(id) {
    people.value = people.value.filter((p) => p.id !== id);
    delete liveDrinkTracking.value[id];
  }

  function addDrinkForPerson(personId, drink) {
    if (!liveDrinkTracking.value[personId]) {
      resetPersonTracking(personId);
    }
    liveDrinkTracking.value[personId].drinkHistory.push({
      ...drink,
      timestamp: new Date(),
    });
    updatePersonBAC(personId);
  }

  function resetPersonTracking(personId) {
    liveDrinkTracking.value[personId] = {
      drinkHistory: [],
      currentBAC: 0,
    };
  }

  function resetAllTracking() {
    liveDrinkTracking.value = {};
    people.value.forEach((person) => {
      resetPersonTracking(person.id);
      clearMaintainBAC(person.id);
    });
    isLive.value = false;
  }

  function toggleLiveMode() {
    isLive.value = !isLive.value;
  }

  function updatePersonBAC(personId) {
    const person = people.value.find((p) => p.id === personId);
    const tracking = liveDrinkTracking.value[personId];

    if (!person || !tracking) return;

    tracking.currentBAC = calculateCurrentBAC(tracking.drinkHistory, person);
  }

  function calculateBACOverTime(person, hours) {
    if (!person || hours === undefined) return 0;

    if (isLive.value && liveDrinkTracking.value[person.id]) {
      return liveDrinkTracking.value[person.id].currentBAC;
    }

    const drink = DRINK_TYPES[drinkType.value];
    const singleDrinkBAC = calculateDrinksForBAC(
      0.02, // Use a small target to get single drink contribution
      person.weight,
      person.gender,
      drink.alcoholPercentage,
      drink.oz
    );

    return Math.max(
      0,
      singleDrinkBAC * person.drinksPerHour * hours -
        BAC_CONSTANTS.METABOLIC_RATE * hours
    );
  }

  function setDrinkType(type) {
    drinkType.value = type;
  }

  function setCompareWeights(value) {
    compareWeights.value = value;
    if (value) {
      compareDrinks.value = false;
    }
  }

  function setCompareDrinks(value) {
    compareDrinks.value = value;
    if (value) {
      compareWeights.value = false;
    }
  }

  function setMaintainBAC(personId, bac) {
    const person = people.value.find((p) => p.id === personId);
    if (person) {
      person.maintainBAC = bac;
      person.lastMaintainTime = new Date();
    }
  }

  function clearMaintainBAC(personId) {
    const person = people.value.find((p) => p.id === personId);
    if (person) {
      person.maintainBAC = null;
      person.lastMaintainTime = null;
    }
  }

  function calculateDrinksToMaintain(personId) {
    const person = people.value.find((p) => p.id === personId);
    if (!person || !person.maintainBAC) return null;

    const tracking = liveDrinkTracking.value[personId];
    if (!tracking) return null;

    const now = new Date();
    const hoursSinceMaintain = person.lastMaintainTime
      ? (now - new Date(person.lastMaintainTime)) / (1000 * 60 * 60)
      : 0;

    const metabolizedBAC = BAC_CONSTANTS.METABOLIC_RATE * hoursSinceMaintain;
    const targetBAC = person.maintainBAC;
    const currentBAC = tracking.currentBAC;

    if (currentBAC >= targetBAC) return 0;

    const drink = DRINK_TYPES[drinkType.value];
    return calculateDrinksForBAC(
      targetBAC - currentBAC + metabolizedBAC,
      person.weight,
      person.gender,
      drink.alcoholPercentage,
      drink.oz
    );
  }

  return {
    // State
    people,
    drinkType,
    compareWeights,
    compareDrinks,
    timeRange,
    liveDrinkTracking,
    isLive,

    // Getters
    recommendedDrinksForTarget,

    // Actions
    addPerson,
    updatePerson,
    removePerson,
    addDrinkForPerson,
    resetPersonTracking,
    resetAllTracking,
    toggleLiveMode,
    updatePersonBAC,
    calculateBACOverTime,
    setDrinkType,
    setCompareWeights,
    setCompareDrinks,
    setMaintainBAC,
    clearMaintainBAC,
    calculateDrinksToMaintain,
  };
});
