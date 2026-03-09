import { computed } from "vue";
import { useAlcoholStore } from "../stores/alcohol";
import { DRINKS } from "../constants/index";
import { useLiveNow } from "./useLiveNow";
import {
  calculateCurrentBAC,
  calculateTimeUntilNextDrink,
  calculateSingleDrinkBAC,
} from "../utils/bac";

export const usedrinks = () => {
  const store = useAlcoholStore();
  const now = useLiveNow();
  const drinks = computed(() => [...DRINKS, ...store.customDrinks]);

  // Get person's drink history
  const getPersonDrinkHistory = (personId) => {
    return store.liveDrinkTracking[personId]?.drinkHistory || [];
  };

  // Get person's current BAC
  const getPersonBAC = (personId) => {
    now.value;

    const person = store.people.find((entry) => entry.id === personId);
    const history = getPersonDrinkHistory(personId);

    if (!person || !history.length) return 0;

    return calculateCurrentBAC(history, person);
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
    const maintainTargetBAC = store.getMaintainTargetBAC(personId);

    // Calculate BAC contribution of next drink
    const nextDrinkBAC = calculateSingleDrinkBAC(
      person.weight,
      person.gender,
      drink.alcoholContent,
      drink.volume
    );

    if (maintainTargetBAC !== null) {
      if (currentBAC < maintainTargetBAC - 0.006) {
        return currentBAC + nextDrinkBAC > maintainTargetBAC + 0.006
          ? "Near"
          : "Aim";
      }

      const minutes = calculateTimeUntilNextDrink(
        currentBAC,
        nextDrinkBAC,
        maintainTargetBAC + 0.004
      );
      if (minutes <= 0) return "Hold";
      return minutes < 60
        ? `Wait ${Math.ceil(minutes)} min`
        : `Wait ${Math.ceil(minutes / 60)}h`;
    }

    const minutes = calculateTimeUntilNextDrink(currentBAC, nextDrinkBAC);
    if (minutes <= 0) return "Ready";
    return minutes < 60
      ? `Wait ${Math.ceil(minutes)} min`
      : `Wait ${Math.ceil(minutes / 60)}h`;
  };

  // Get appropriate class for next drink time display
  const getNextDrinkClass = (personId, drink) => {
    const timeText = getNextDrinkTime(personId, drink);
    if (timeText === "Error") return "bg-red-100 text-red-800";
    if (["Ready", "Aim", "Hold"].includes(timeText)) {
      return "bg-green-100 text-green-800";
    }
    if (timeText === "Near") return "bg-amber-100 text-amber-800";
    if (timeText.includes("h")) {
      return "bg-red-100 text-red-800";
    }
    return "bg-yellow-100 text-yellow-800";
  };

  const getNextDrinkTintClass = (personId, drink) => {
    const timeText = getNextDrinkTime(personId, drink);
    if (["Ready", "Aim", "Hold"].includes(timeText)) {
      return "border-emerald-200 bg-emerald-50/80";
    }
    if (timeText === "Near") {
      return "border-amber-200 bg-amber-50/90";
    }
    return "border-rose-200 bg-rose-50/90";
  };

  // Check if any drinks have been logged
  const hasAnyDrinks = computed(() => {
    return Object.values(store.liveDrinkTracking).some(
      (tracking) => tracking.drinkHistory.length > 0
    );
  });

  return {
    drinks,
    getPersonDrinkHistory,
    getPersonBAC,
    getDrinkCount,
    addDrink,
    getNextDrinkTime,
    getNextDrinkClass,
    getNextDrinkTintClass,
    hasAnyDrinks,
  };
};
