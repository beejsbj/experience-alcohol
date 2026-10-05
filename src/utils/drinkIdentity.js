import { DRINKS } from "../constants";

const defaults = new Set(DRINKS.map((drink) => drink.type));

// New events carry identity; old events can only use their original type.
export const isCustomDrink = (event) => event.isCustom ?? Boolean(event.drinkId || !defaults.has(event.type));
