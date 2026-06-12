<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "./stores/session";
import { calculateBACAtTime } from "./utils/bac";
import { useLiveNow } from "./composables/useLiveNow";
import BubbleField from "./components/BubbleField.vue";
import ReceiptDeck from "./components/ReceiptDeck.vue";
import TableView from "./components/TableView.vue";
import CloseTab from "./components/CloseTab.vue";

const store = useSessionStore();
const now = useLiveNow();

const view = ref("deck"); // 'deck' | 'table'

const focusedPerson = computed(() => store.person(store.focusedPersonId));
const bubbleIntensity = computed(() => {
  if (!focusedPerson.value) return 0;
  const bac = calculateBACAtTime(
    store.eventsFor(focusedPerson.value.id),
    focusedPerson.value,
    now.value
  );
  return Math.min(1, bac / 0.12);
});

const showTable = () => { view.value = "table"; };
const showDeck = () => { view.value = "deck"; };
</script>

<template>
  <div class="relative w-full overflow-hidden" style="min-height: 100dvh; background: var(--table);">
    <!-- Canvas bubble field behind everything -->
    <BubbleField :intensity="bubbleIntensity" style="z-index: 0;" />
    <div class="table-grain" style="z-index: 1;" aria-hidden="true"></div>

    <!-- Main content layer -->
    <div class="relative" style="z-index: 2;">
      <Transition name="view-fade" mode="out-in">
        <ReceiptDeck v-if="view === 'deck'" @table="showTable" />
        <TableView v-else @pickup="showDeck" />
      </Transition>
    </div>

    <!-- Keepsake overlay (on top of everything) -->
    <CloseTab />
  </div>
</template>

<style scoped>
.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity 180ms ease;
}
.view-fade-enter-from,
.view-fade-leave-to {
  opacity: 0;
}
</style>
