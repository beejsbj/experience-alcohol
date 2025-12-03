// no vue refs needed here
import { useAlcoholStore } from "../stores/alcohol";
import { FEELING_STATES, MAINTENANCE } from "../constants";
import { usedrinks } from "./usedrinks";
import {
  calculateRelativePace,
  calculateDrinksUntilExtra,
  calculateDrinksUntilSkip,
} from "../utils/bac";

export const useperson = () => {
  const store = useAlcoholStore();
  const { getPersonBAC } = usedrinks();

  // Get current feeling state for a person
  const getCurrentFeelingState = (personId) => {
    const bac = getPersonBAC(personId);
    const state = FEELING_STATES.find(
      (state) => bac >= state.minBAC && bac <= state.maxBAC
    );
    return state ? state.state : "Sober";
  };

  // Get recommendation for a person
  const getRecommendation = (personId) => {
    const person = store.people.find((p) => p.id === personId);
    if (!person) return "Error loading person data";

    const bac = getPersonBAC(personId);
    const currentState = FEELING_STATES.find(
      (state) => bac >= state.minBAC && bac <= state.maxBAC
    );

    // If in maintenance mode, return a simplified recommendation
    if (person.maintainBAC) {
      if (bac > person.maintainBAC * MAINTENANCE.UPPER_THRESHOLD) {
        return "You're above your target BAC. Take a break from drinking.";
      } else if (bac < person.maintainBAC * MAINTENANCE.LOWER_THRESHOLD) {
        return "You're below your target BAC. Follow the maintenance advice below.";
      } else {
        return "You're maintaining your target BAC level well.";
      }
    }

    // Regular recommendations based on feeling states
    if (bac === 0) return "Ready to start tracking drinks";
    if (!currentState) return "STOP drinking and drink water instead";

    switch (currentState.state) {
      case "Sober":
      case "Barely Noticeable":
        return "You're doing fine, drink water between drinks";
      case "Pleasantly Relaxed":
        return "Consider slowing down and having some water";
      case "Definitely Tipsy":
        return "You should definitely slow down now";
      default:
        return "STOP drinking and drink water instead";
    }
  };

  // Get BAC color class based on feeling states
  const getBACColorClass = (bac) => {
    const currentState = FEELING_STATES.find(
      (state) => bac >= state.minBAC && bac <= state.maxBAC
    );

    if (!currentState) return "text-red-600";

    switch (currentState.state) {
      case "Sober":
      case "Barely Noticeable":
        return "text-green-600";
      case "Pleasantly Relaxed":
        return "text-yellow-600";
      case "Definitely Tipsy":
        return "text-orange-600";
      default:
        return "text-red-600";
    }
  };

  // Maintain BAC functionality
  const setMaintainLevel = (person) => {
    if (!person) return;
    const currentBAC = getPersonBAC(person.id);
    if (currentBAC > 0) {
      store.setMaintainBAC(person.id, currentBAC);
    }
  };

  const clearMaintainLevel = (person) => {
    if (!person) return;
    store.clearMaintainBAC(person.id);
  };

  // Get maintenance advice
  const getMaintainanceAdvice = (personId) => {
    const drinksNeeded = store.calculateDrinksToMaintain(personId);
    if (drinksNeeded === null) return "";
    if (drinksNeeded === 0) return "No additional drinks needed right now.";

    const roundedDrinks = Math.round(drinksNeeded * 10) / 10;
    return `To maintain your level, have ${roundedDrinks} standard drink${
      roundedDrinks === 1 ? "" : "s"
    } in the next hour.`;
  };

  // wrappers for UI that plug in reference person automatically
  const getRelativePace = (person) => {
    if (!person) return "0.0";
    const referencePerson = store.people[0];
    if (!referencePerson) return "0.0";
    return calculateRelativePace(referencePerson, person).toFixed(1);
  };

  const getDrinksUntilExtra = (person) => {
    if (!person) return "N/A";
    const referencePerson = store.people[0];
    const val = calculateDrinksUntilExtra(referencePerson, person);
    return val === null ? "N/A" : val;
  };

  const getDrinksUntilSkip = (person) => {
    if (!person) return "N/A";
    const referencePerson = store.people[0];
    const val = calculateDrinksUntilSkip(referencePerson, person);
    return val === null ? "N/A" : val;
  };

  // Update person information
  const updatePerson = (personId, updates) => {
    if (!personId) return;
    store.updatePerson(personId, updates);
  };

  return {
    getCurrentFeelingState,
    getRecommendation,
    getBACColorClass,
    setMaintainLevel,
    clearMaintainLevel,
    getMaintainanceAdvice,
    calculateRelativePace: getRelativePace,
    calculateDrinksUntilExtra: getDrinksUntilExtra,
    calculateDrinksUntilSkip: getDrinksUntilSkip,
    updatePerson,
  };
};
