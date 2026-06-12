<script setup>
import { computed } from "vue";
import { useSessionStore } from "../stores/session";
import { calculateSingleDrinkBAC } from "../utils/bac";
import { DRINKS } from "../constants";

const store = useSessionStore();
const DEFAULT_TYPES = new Set(DRINKS.map((drink) => drink.type));

const lines = computed(() => {
  const multiplePeople = store.session.people.length > 1;
  return [...store.session.events]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((event) => {
      const person = store.session.people.find((p) => p.id === event.personId);
      const delta = person
        ? calculateSingleDrinkBAC(person.weight, person.gender, event.abv, event.volume)
        : 0;
      return {
        id: event.id,
        time: new Date(event.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        label: multiplePeople && person ? `${person.name.slice(0, 4)} · ${event.type}` : event.type,
        delta: `+${delta.toFixed(3)}`,
        faded: person ? !person.active : true,
        note: DEFAULT_TYPES.has(event.type) ? null : "house special",
      };
    });
});
</script>

<template>
  <section>
    <div class="flex items-baseline justify-between">
      <p class="eyebrow print">tonight's receipt</p>
      <span class="scribble text-[13px]" style="color: var(--pen)">the damage so far →</span>
    </div>
    <p v-if="!lines.length" class="scribble mt-2 text-center text-base" style="color: var(--faded)">
      tap a drink to start your tab
    </p>
    <ul v-else class="print mt-2 space-y-1 text-[11px]">
      <li
        v-for="line in lines"
        :key="line.id"
        class="flex items-baseline gap-2"
        :style="{ opacity: line.faded ? 0.45 : 1 }"
      >
        <span style="color: var(--faded)">{{ line.time }}</span>
        <span class="uppercase">{{ line.label }}</span>
        <span class="receipt-dots flex-1" aria-hidden="true"></span>
        <span>{{ line.delta }}</span>
        <span v-if="line.note" class="scribble text-[12px]" style="color: var(--redpen)">
          {{ line.note }}
        </span>
      </li>
    </ul>
  </section>
</template>
