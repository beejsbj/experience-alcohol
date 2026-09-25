<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { DRINKS } from "../constants";
import { calculateBACAtTime } from "../utils/bac";
import { CUTOFF_BAC, nextPourMinutes } from "../utils/feelings";
import { glassFor } from "../utils/window";
import { triggerHaptic } from "../utils/haptics";
import CustomDrinkSheet from "./CustomDrinkSheet.vue";

// Pour by tapping a lancet: each is a tall arched window of that drink's glass.
// A lancet that would overshoot tonight's vibe dims and shows the wait, but
// still pours — the app advises, it doesn't confiscate.
const props = defineProps({
  person: { type: Object, required: true },
  target: { type: Object, default: null }, // element the poured glass flies to
});

const store = useSessionStore();
const now = useLiveNow();
const customOpen = ref(false);

const bac = computed(() => calculateBACAtTime(store.eventsFor(props.person.id), props.person, now.value));
const cutOff = computed(() => bac.value >= CUTOFF_BAC);

const drinks = computed(() => [
  ...DRINKS,
  ...store.session.customDrinks,
]);

const waitFor = (drink) => {
  if (cutOff.value) return null;
  const m = nextPourMinutes(bac.value, props.person, drink, props.person.pinnedState);
  return m && m > 0 ? m : 0;
};

const waitLabel = (drink) => {
  const m = waitFor(drink);
  if (m === null) return "no";
  if (!m) return "";
  return m < 60 ? `${Math.ceil(m)}m` : `${Math.floor(m / 60)}h${Math.round(m % 60) ? Math.round(m % 60) : ""}`;
};

const ARCH = "M2 118 L2 46 C2 22 16 7 34 2 C52 7 66 22 66 46 L66 118 Z";

const pour = (drink, event) => {
  const wait = waitFor(drink);
  triggerHaptic(wait === null || wait > 0 ? "warning" : "tap");
  store.logDrink(props.person.id, drink);
  flyGlass(event.currentTarget, glassFor(drink.type));
};

// A drop of glass leaves the lancet and lands in the window.
function flyGlass(from, color) {
  const to = props.target;
  if (!from || !to || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const drop = document.createElement("div");
  drop.className = "glass-drop";
  drop.style.background = color;
  drop.style.left = `${a.left + a.width / 2 - 9}px`;
  drop.style.top = `${a.top + a.height / 3}px`;
  document.body.appendChild(drop);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 3);
  drop
    .animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(1.3)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0 },
      ],
      { duration: 620, easing: "cubic-bezier(0.45, 0, 0.3, 1)" }
    )
    .finished.finally(() => drop.remove());
}
</script>

<template>
  <div class="pour-row">
    <button
      v-for="drink in drinks"
      :key="drink.id ?? drink.type"
      type="button"
      class="lancet"
      :class="{ 'is-waiting': waitLabel(drink) }"
      :aria-label="`pour a ${drink.type}`"
      @click="pour(drink, $event)"
    >
      <svg viewBox="0 0 68 120" class="lancet__glass" aria-hidden="true">
        <path :d="ARCH" :fill="glassFor(drink.type)" class="lancet__pane" />
        <path d="M34 2 L34 118 M2 70 L66 70" class="lancet__lead" />
        <path :d="ARCH" class="lancet__frame" />
      </svg>
      <span v-if="waitLabel(drink)" class="lancet__wait mono">{{ waitLabel(drink) }}</span>
      <span class="lancet__name slab">{{ drink.type }}</span>
    </button>

    <button type="button" class="lancet lancet--new" aria-label="pour something else" @click="customOpen = true">
      <svg viewBox="0 0 68 120" class="lancet__glass" aria-hidden="true">
        <path :d="ARCH" class="lancet__empty" />
        <path d="M34 50 L34 86 M16 68 L52 68" class="lancet__plus" />
      </svg>
      <span class="lancet__name slab">other</span>
    </button>

    <CustomDrinkSheet v-if="customOpen" :person="person" @close="customOpen = false" />
  </div>
</template>

<style scoped>
.pour-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 6px 20px 4px;
  scroll-snap-type: x proximity;
}
.lancet {
  position: relative;
  flex: 0 0 62px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: none;
  border: 0;
  padding: 0;
  color: var(--bone);
  scroll-snap-align: start;
  transition: transform 160ms var(--ease-spring);
}
.lancet:active {
  transform: translateY(3px) scale(0.96);
}
.lancet__glass {
  width: 62px;
  height: auto;
  overflow: visible;
}
.lancet__pane {
  transition: opacity 400ms ease;
}
.lancet__lead {
  stroke: var(--lead);
  stroke-width: 3;
  fill: none;
}
.lancet__frame {
  fill: none;
  stroke: var(--lead);
  stroke-width: 4;
}
.lancet:not(.is-waiting) .lancet__glass {
  filter: drop-shadow(0 0 12px rgba(255, 230, 170, 0.18));
}
.lancet.is-waiting .lancet__pane {
  opacity: 0.42;
}
.lancet__wait {
  position: absolute;
  top: 46px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--bone);
}
.lancet__name {
  font-size: 13px;
  letter-spacing: 0.06em;
}
.lancet__empty {
  fill: none;
  stroke: var(--bone-3);
  stroke-width: 2;
  stroke-dasharray: 3 5;
}
.lancet__plus {
  stroke: var(--bone-2);
  stroke-width: 3;
  stroke-linecap: round;
}
</style>

<style>
.glass-drop {
  position: fixed;
  z-index: 60;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--lead);
  box-shadow: 0 0 14px 2px rgba(255, 230, 170, 0.5);
  pointer-events: none;
}
</style>
