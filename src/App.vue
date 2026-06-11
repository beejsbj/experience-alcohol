<script setup>
import { computed } from "vue";
import { useSessionStore } from "./stores/session";
import TabHeader from "./components/TabHeader.vue";
import FeelingCard from "./components/FeelingCard.vue";
import PourRow from "./components/PourRow.vue";
import VibeChart from "./components/VibeChart.vue";
import ReceiptLog from "./components/ReceiptLog.vue";
import CloseTab from "./components/CloseTab.vue";
import SquiggleDivider from "./components/SquiggleDivider.vue";

const store = useSessionStore();
const focused = computed(() => store.person(store.focusedPersonId));
</script>

<template>
  <main class="relative mx-auto min-h-screen w-full max-w-md overflow-x-clip px-4 pb-16 pt-5">
    <div class="stain stain-1" aria-hidden="true"></div>
    <div class="stain stain-2" aria-hidden="true"></div>

    <TabHeader />

    <template v-if="focused">
      <FeelingCard :person="focused" class="mt-4" />
      <PourRow :person="focused" class="mt-4" />
    </template>

    <SquiggleDivider :seed="2" class="mt-6" />
    <VibeChart class="mt-2" />
    <ReceiptLog class="mt-5" />
    <CloseTab class="mt-6" />

    <p class="print mt-8 text-center text-[10px] leading-5" style="color: var(--faded)">
      estimates only · never a reason to drive<br />
      drink water, you animal
    </p>
  </main>
</template>
