// no vue refs needed here
import { useAlcoholStore } from "../stores/alcohol";
import { FEELING_STATES, MAINTAINABLE_STATES } from "../constants";
import { usedrinks } from "./usedrinks";

export const useperson = () => {
  const store = useAlcoholStore();
  const { getPersonBAC } = usedrinks();

  const getCurrentFeelingDetails = (personId) => {
    const bac = getPersonBAC(personId);

    return (
      [...FEELING_STATES]
        .reverse()
        .find((state) => bac >= state.minBAC) || FEELING_STATES[0]
    );
  };

  const getCurrentFeelingState = (personId) => {
    return getCurrentFeelingDetails(personId).state;
  };

  const getMaintainOptions = () => MAINTAINABLE_STATES;

  const getSuggestedMaintainDetails = (personId) => {
    const bac = getPersonBAC(personId);
    const currentState = getCurrentFeelingDetails(personId);
    const matchingOption = MAINTAINABLE_STATES.find(
      (state) => state.state === currentState.state
    );

    if (matchingOption) return matchingOption;
    if (bac >= MAINTAINABLE_STATES[MAINTAINABLE_STATES.length - 1].minBAC) {
      return MAINTAINABLE_STATES[MAINTAINABLE_STATES.length - 1];
    }
    return MAINTAINABLE_STATES[1];
  };

  const getMaintainTargetDetails = (personId) => {
    const person = store.people.find((entry) => entry.id === personId);
    if (!person?.maintainTargetState) return null;

    return (
      MAINTAINABLE_STATES.find(
        (state) => state.state === person.maintainTargetState
      ) || null
    );
  };

  const getDisplayedMaintainDetails = (personId) => {
    return getMaintainTargetDetails(personId) || getSuggestedMaintainDetails(personId);
  };

  const isMaintaining = (personId) => {
    return Boolean(getMaintainTargetDetails(personId));
  };

  const getRecommendation = (personId) => {
    const person = store.people.find((p) => p.id === personId);
    if (!person) return "Error loading person data";

    const bac = getPersonBAC(personId);
    const currentState = getCurrentFeelingDetails(personId);
    const maintainTarget = getMaintainTargetDetails(personId);

    if (maintainTarget) {
      if (bac === 0) {
        return `Aiming for ${maintainTarget.state}. Start slow and reassess each round.`;
      }

      if (bac < maintainTarget.minBAC) {
        return `Below ${maintainTarget.state}. If you're still heading there, add drinks gradually.`;
      }

      if (bac > maintainTarget.maxBAC) {
        return `Above ${maintainTarget.state}. Pause until you drift back into range.`;
      }

      return `You're around ${maintainTarget.state}. Keep the pace light to stay there.`;
    }

    if (bac === 0) return "Ready to start tracking drinks";

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

  const getMaintainStatusCopy = (personId) => {
    const target = getMaintainTargetDetails(personId);
    if (!target) {
      return "Lock a target and the drink timing shifts toward holding that state.";
    }

    const bac = getPersonBAC(personId);

    if (bac < target.minBAC) {
      return `Working toward ${target.state}.`;
    }

    if (bac > target.maxBAC) {
      return `Currently above ${target.state}.`;
    }

    return `Holding ${target.state}.`;
  };

  const getBACColorClass = (bac) => {
    const currentState =
      [...FEELING_STATES].reverse().find((state) => bac >= state.minBAC) ||
      FEELING_STATES[0];

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

  return {
    getCurrentFeelingDetails,
    getCurrentFeelingState,
    getMaintainOptions,
    getSuggestedMaintainDetails,
    getMaintainTargetDetails,
    getDisplayedMaintainDetails,
    getMaintainStatusCopy,
    getRecommendation,
    getBACColorClass,
    isMaintaining,
    setMaintainTarget: store.setMaintainTarget,
    clearMaintainTarget: store.clearMaintainTarget,
  };
};
