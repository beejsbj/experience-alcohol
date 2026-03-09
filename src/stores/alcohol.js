import { defineStore } from "pinia";
import { DEFAULT_PERSON, MAINTAINABLE_STATES } from "../constants";
import { ref, watch } from "vue";
import { calculateCurrentBAC } from "../utils/bac";

const PERSON_COLORS = ["#B85C38", "#2E6F70", "#8D5A97", "#A2642A", "#4D6F52"];
const STORAGE_KEY = "experience-alcohol:fab-layout:v1";

const createTrackingState = () => ({
  drinkHistory: [],
  currentBAC: 0,
});

const normalizeCustomDrink = (drink = {}) => ({
  id: drink.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type: drink.type?.trim() || "Custom",
  icon: drink.icon || null,
  glyph: drink.glyph || (drink.type?.trim()?.charAt(0).toUpperCase() || "C"),
  alcoholContent: Number(drink.alcoholContent) || 0.05,
  volume: Number(drink.volume) || 12,
});

const getStorage = () => {
  if (typeof globalThis === "undefined") return null;
  return globalThis.localStorage ?? null;
};

const normalizeTrackingState = (tracking = {}) => ({
  drinkHistory: Array.isArray(tracking.drinkHistory)
    ? tracking.drinkHistory.map((drink) => ({
        ...drink,
        timestamp: drink.timestamp ?? new Date().toISOString(),
      }))
    : [],
  currentBAC: Number(tracking.currentBAC) || 0,
});

const buildPerson = (id, person = {}) => {
  const fallbackColor = PERSON_COLORS[(id - 1) % PERSON_COLORS.length];

  return {
    ...DEFAULT_PERSON,
    id,
    color: fallbackColor,
    name: `Guest ${id}`,
    ...person,
    color: person.color || fallbackColor,
    name: person.name?.trim() || `Guest ${id}`,
    maintainTargetState: person.maintainTargetState ?? null,
  };
};

const createDefaultState = () => ({
  people: [buildPerson(1, { name: "You" })],
  customDrinks: [],
  liveDrinkTracking: {
    1: createTrackingState(),
  },
});

const loadState = () => {
  const storage = getStorage();

  if (!storage) return createDefaultState();

  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
    if (!parsed || !Array.isArray(parsed.people) || !parsed.people.length) {
      return createDefaultState();
    }

    const people = parsed.people.map((person, index) =>
      buildPerson(Number(person.id) || index + 1, person)
    );
    const tracking = Object.fromEntries(
      people.map((person) => [
        person.id,
        normalizeTrackingState(parsed.liveDrinkTracking?.[person.id]),
      ])
    );

    return {
      people,
      customDrinks: Array.isArray(parsed.customDrinks)
        ? parsed.customDrinks.map((drink) => normalizeCustomDrink(drink))
        : [],
      liveDrinkTracking: tracking,
    };
  } catch {
    return createDefaultState();
  }
};

export const useAlcoholStore = defineStore("alcohol", () => {
  const initialState = loadState();
  const people = ref(initialState.people);
  const customDrinks = ref(initialState.customDrinks);
  const liveDrinkTracking = ref(initialState.liveDrinkTracking);

  function addPerson(person = {}) {
    const newId = Math.max(0, ...people.value.map((p) => p.id)) + 1;
    people.value.push(buildPerson(newId, person));
    liveDrinkTracking.value[newId] = createTrackingState();
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
    liveDrinkTracking.value[personId] = createTrackingState();
  }

  function resetAllTracking() {
    liveDrinkTracking.value = {};
    people.value.forEach((person) => {
      resetPersonTracking(person.id);
      person.maintainTargetState = null;
    });
  }

  function updatePersonBAC(personId) {
    const person = people.value.find((p) => p.id === personId);
    const tracking = liveDrinkTracking.value[personId];

    if (!person || !tracking) return;

    tracking.currentBAC = calculateCurrentBAC(tracking.drinkHistory, person);
  }

  function addCustomDrink(drink) {
    customDrinks.value.push(normalizeCustomDrink(drink));
  }

  function setMaintainTarget(personId, stateName) {
    const person = people.value.find((p) => p.id === personId);
    if (!person) return;

    const state = MAINTAINABLE_STATES.find((entry) => entry.state === stateName);
    person.maintainTargetState = state ? state.state : null;
  }

  function clearMaintainTarget(personId) {
    const person = people.value.find((p) => p.id === personId);
    if (!person) return;
    person.maintainTargetState = null;
  }

  function getMaintainTargetBAC(personId) {
    const person = people.value.find((p) => p.id === personId);
    if (!person?.maintainTargetState) return null;

    const state = MAINTAINABLE_STATES.find(
      (entry) => entry.state === person.maintainTargetState
    );
    if (!state) return null;

    return Number(((state.minBAC + state.maxBAC) / 2).toFixed(3));
  }

  people.value.forEach((person) => {
    updatePersonBAC(person.id);
  });

  watch(
    [people, customDrinks, liveDrinkTracking],
    () => {
      const storage = getStorage();
      if (!storage) return;

      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          people: people.value,
          customDrinks: customDrinks.value,
          liveDrinkTracking: liveDrinkTracking.value,
        })
      );
    },
    { deep: true }
  );

  return {
    people,
    customDrinks,
    liveDrinkTracking,
    addPerson,
    updatePerson,
    removePerson,
    addDrinkForPerson,
    resetPersonTracking,
    resetAllTracking,
    updatePersonBAC,
    addCustomDrink,
    setMaintainTarget,
    clearMaintainTarget,
    getMaintainTargetBAC,
  };
});
