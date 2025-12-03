import { computed } from "vue";
import { useAlcoholStore } from "../stores/alcohol";
import { DRINKS } from "../constants/index";
import {
  calculateTimeUntilNextDrink,
  calculateSingleDrinkBAC,
} from "../utils/bac";

export const usedrinks = () => {
  const store = useAlcoholStore();

  // Get person's drink history
  const getPersonDrinkHistory = (personId) => {
    return store.liveDrinkTracking[personId]?.drinkHistory || [];
  };

  // Get person's current BAC
  const getPersonBAC = (personId) => {
    return store.liveDrinkTracking[personId]?.currentBAC || 0;
  };

  // Get drink count for a person and drink type
  const getDrinkCount = (personId, drinkType) => {
    return getPersonDrinkHistory(personId).filter((d) => d.type === drinkType)
      .length;
  };

  // Add a drink for a person
  const addDrink = (drink, person) => {
    if (!person || !person.id) return;
    store.addDrinkForPerson(person.id, drink);
  };

  // Calculate when the next drink can be safely consumed
  const getNextDrinkTime = (personId, drink) => {
    const person = store.people.find((p) => p.id === personId);
    if (!person) return "Error";

    const currentBAC = getPersonBAC(personId);

    // Calculate BAC contribution of next drink
    const nextDrinkBAC = calculateSingleDrinkBAC(
      person.weight,
      person.gender,
      drink.alcoholContent,
      drink.volume
    );

    // If maintaining a level
    if (person.maintainBAC) {
      const minutes = calculateTimeUntilNextDrink(
        currentBAC,
        person.maintainBAC,
        nextDrinkBAC
      );

      if (minutes <= 0) return "Drink now to maintain";
      return minutes < 60
        ? `Wait ${Math.ceil(minutes)} min`
        : `Wait ${Math.ceil(minutes / 60)}h`;
    }

    // Regular mode
    const minutes = calculateTimeUntilNextDrink(currentBAC, null, nextDrinkBAC);
    if (minutes <= 0) return "Ready";
    return minutes < 60
      ? `Wait ${Math.ceil(minutes)} min`
      : `Wait ${Math.ceil(minutes / 60)}h`;
  };

  // Get appropriate class for next drink time display
  const getNextDrinkClass = (personId, drink) => {
    const timeText = getNextDrinkTime(personId, drink);
    if (timeText === "Error") return "bg-red-100 text-red-800";
    if (timeText === "Ready" || timeText === "Drink now to maintain") {
      return "bg-green-100 text-green-800";
    }
    if (timeText.includes("h")) {
      return "bg-red-100 text-red-800";
    }
    return "bg-yellow-100 text-yellow-800";
  };

  // Check if any drinks have been logged
  const hasAnyDrinks = computed(() => {
    return Object.values(store.liveDrinkTracking).some(
      (tracking) => tracking.drinkHistory.length > 0
    );
  });

  return {
    drinks: DRINKS,
    getPersonDrinkHistory,
    getPersonBAC,
    getDrinkCount,
    addDrink,
    getNextDrinkTime,
    getNextDrinkClass,
    hasAnyDrinks,
  };
};
