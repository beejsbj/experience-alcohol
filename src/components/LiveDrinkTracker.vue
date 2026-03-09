<script setup>
import { computed, nextTick, ref } from "vue";
import { useAlcoholStore } from "../stores/alcohol";
import { usedrinks } from "../composables/usedrinks";
import { useperson } from "../composables/useperson";
import { triggerHaptic } from "../utils/haptics";
import PersonCard from "./person/PersonCard.vue";
import SessionChart from "./SessionChart.vue";

const store = useAlcoholStore();
const { drinks, addDrink, getPersonBAC } = usedrinks();
const { getCurrentFeelingState } = useperson();
const quickLogPersonId = ref(null);
const personSectionRefs = ref({});

const addNewPerson = () => {
  store.addPerson();
  quickLogPersonId.value = store.people.at(-1)?.id ?? null;
  triggerHaptic("success");
};

const resetAll = () => {
  store.resetAllTracking();
  quickLogPersonId.value = null;
  triggerHaptic("warning");
};

const totalDrinks = computed(() =>
  Object.values(store.liveDrinkTracking).reduce(
    (total, tracking) => total + tracking.drinkHistory.length,
    0
  )
);

const personSummaries = computed(() =>
  store.people.map((person) => ({
    ...person,
    bac: getPersonBAC(person.id),
    state: getCurrentFeelingState(person.id),
  }))
);

const activeQuickLogPerson = computed(() =>
  store.people.find((person) => person.id === quickLogPersonId.value) || null
);

const setPersonSectionRef = (personId, element) => {
  if (element) {
    personSectionRefs.value[personId] = element;
    return;
  }

  delete personSectionRefs.value[personId];
};

const scrollToPerson = async (personId) => {
  quickLogPersonId.value = personId;
  triggerHaptic("selection");
  await nextTick();
  personSectionRefs.value[personId]?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
};

const toggleQuickLogDock = (personId) => {
  quickLogPersonId.value = quickLogPersonId.value === personId ? null : personId;
  triggerHaptic("selection");
};

const quickLogDrink = (drink) => {
  if (!activeQuickLogPerson.value) return;
  addDrink(drink, activeQuickLogPerson.value);
  triggerHaptic("tap");
};

const closeQuickLogDock = () => {
  quickLogPersonId.value = null;
  triggerHaptic("selection");
};

const getInitials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";
</script>

<template>
  <section class="space-y-3 pb-32">
    <header class="session-rail sticky top-3 z-40 enter-rise">
      <div class="session-rail__row">
        <div class="session-rail__people">
          <button
            v-for="person in personSummaries"
            :key="person.id"
            class="session-person-pill"
            @click="scrollToPerson(person.id)"
          >
            <span
              class="session-person-pill__pulse"
              :style="{ backgroundColor: person.color }"
            ></span>
            <span class="session-person-pill__name">{{ person.name }}</span>
            <span class="session-person-pill__bac">{{ person.bac.toFixed(3) }}%</span>
          </button>
        </div>
        <div class="session-rail__meta">
          <span class="fab-chip">{{ store.people.length }}p</span>
          <span class="fab-chip">{{ totalDrinks }}d</span>
          <button class="session-rail__reset" @click="resetAll">Reset</button>
        </div>
      </div>
    </header>

    <div class="space-y-3">
      <div
        v-for="person in store.people"
        :key="person.id"
        :ref="(element) => setPersonSectionRef(person.id, element)"
      >
        <PersonCard
          :person="person"
          :can-remove="store.people.length > 1"
        />
      </div>
    </div>

    <SessionChart />

    <transition name="dock-sheet">
      <div v-if="activeQuickLogPerson" class="fab-quick-sheet">
        <div class="fab-quick-sheet__header">
          <div class="space-y-1">
            <p class="surface-label">Quick pour</p>
            <p class="text-sm font-semibold text-[color:var(--ink)]">
              {{ activeQuickLogPerson.name }}
            </p>
          </div>

          <button
            class="icon-button"
            @click="closeQuickLogDock"
            aria-label="Close quick pour"
          >
            ×
          </button>
        </div>

        <div class="fab-quick-sheet__drinks">
          <button
            v-for="drink in drinks"
            :key="drink.type"
            class="fab-quick-sheet__drink"
            @click="quickLogDrink(drink)"
          >
            <img
              v-if="drink.icon"
              :src="drink.icon"
              :alt="drink.type"
              class="h-4 w-4"
            />
            <span v-else class="fab-quick-sheet__glyph">
              {{ drink.glyph || drink.type.charAt(0).toUpperCase() }}
            </span>
            <span>{{ drink.type }}</span>
          </button>
        </div>
      </div>
    </transition>

    <div class="fab-dock">
      <div class="fab-person-stack">
        <button
          v-for="person in personSummaries"
          :key="`dock-${person.id}`"
          class="fab-person-button"
          :class="{ 'fab-person-button--active': quickLogPersonId === person.id }"
          :style="{ '--person-color': person.color }"
          @click="toggleQuickLogDock(person.id)"
          :aria-label="`Quick log for ${person.name}`"
        >
          <span class="fab-person-button__initials">
            {{ getInitials(person.name) }}
          </span>
          <span class="fab-person-button__state">
            {{ person.state }}
          </span>
        </button>
      </div>

      <button class="fab-floating-action" @click="addNewPerson" aria-label="Add person">
        +
      </button>
    </div>
  </section>
</template>
