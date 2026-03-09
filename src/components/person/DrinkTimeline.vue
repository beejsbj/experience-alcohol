<script setup>
import { ref, defineProps, computed } from "vue";
import { usedrinks } from "../../composables/usedrinks";
import { useLiveNow } from "../../composables/useLiveNow";

const props = defineProps({
  personId: {
    type: Number,
    required: true,
  },
  personColor: {
    type: String,
    required: true,
  },
});

const isOpen = ref(false);
const now = useLiveNow();
const { getPersonDrinkHistory } = usedrinks();

const toggleOpen = () => {
  isOpen.value = !isOpen.value;
};

const drinkHistory = computed(() => getPersonDrinkHistory(props.personId));

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatAgo = (timestamp) => {
  const minutes = Math.round((now.value - new Date(timestamp)) / (1000 * 60));

  if (minutes <= 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m ago` : `${hours}h ago`;
};
</script>

<template>
  <div class="tracker-panel tracker-panel--soft">
    <button
      @click="toggleOpen"
      class="flex w-full items-center justify-between gap-3 text-left"
    >
      <div>
        <p class="surface-label">Drink history</p>
        <p class="text-xs text-[color:var(--muted)]">
          {{ drinkHistory.length }} event{{ drinkHistory.length === 1 ? "" : "s" }}
        </p>
      </div>
      <span class="stat-pill" :class="{ 'rotate-180': isOpen }">▼</span>
    </button>
    <div v-show="isOpen" class="mt-2.5 border-t border-[color:var(--line)] pt-2.5">
      <div class="max-h-32 space-y-1.5 overflow-y-auto pr-1">
        <div
          v-for="(drink, index) in drinkHistory"
          :key="index"
          class="flex items-center gap-2 rounded-[14px] border border-[color:var(--line)] p-2 text-sm"
          :style="{ backgroundColor: `${personColor}12` }"
        >
          <img :src="drink.icon" :alt="drink.type" class="h-4 w-4" />
          <div class="min-w-0">
            <p class="text-sm font-medium text-[color:var(--ink)]">{{ drink.type }}</p>
            <p class="text-[11px] text-[color:var(--muted)]">
              {{ formatAgo(drink.timestamp) }}
            </p>
          </div>
          <span class="ml-auto text-[11px] text-[color:var(--muted)]">
            {{ formatTime(drink.timestamp) }}
          </span>
        </div>
        <div
          v-if="!drinkHistory.length"
          class="py-3 text-center text-sm text-[color:var(--muted)]"
        >
          No drinks logged yet
        </div>
      </div>
    </div>
  </div>
</template>
