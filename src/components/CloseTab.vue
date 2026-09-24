<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { triggerHaptic } from "../utils/haptics";
import { scatter } from "../utils/scatter";

const store = useSessionStore();
const confirming = ref(false);

const hasEvents = computed(() => store.session.events.length > 0);

const close = () => {
  if (!confirming.value) {
    confirming.value = true;
    return;
  }
  store.closeTab();
  confirming.value = false;
  triggerHaptic("success");
};

const duration = (tab) => {
  const ms = new Date(tab.closedAt) - new Date(tab.startedAt);
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};
</script>

<template>
  <!-- Keepsake overlay — receipt on the table -->
  <div v-if="store.lastTab" class="keepsake" role="dialog" aria-label="Closed tab summary">
    <div
      class="receipt-paper w-full p-5"
      style="max-width: 360px;"
      :style="scatter('keepsake', { r: 2, x: 6, y: 4 })"
    >
      <p class="masthead print">TAB CLOSED · {{ duration(store.lastTab) }}</p>

      <p class="scribble mt-2 text-2xl" style="color: var(--pen)">{{ store.lastTab.nickname }}</p>

      <!-- Dashed separator -->
      <p class="print text-center text-[10px] my-2 tracking-widest" style="color: var(--faded)">· · · · · · · · · · · · · · · ·</p>

      <p v-if="!store.lastTab.summary.length" class="print text-[11px]" style="color: var(--faded)">
        a quiet one — nothing poured.
      </p>

      <div
        v-for="entry in store.lastTab.summary"
        :key="entry.name"
        class="print mt-2 text-[11px]"
      >
        <p class="font-bold uppercase tracking-wide">{{ entry.name }}</p>
        <p style="color: var(--faded)">
          {{ entry.drinks }} drink{{ entry.drinks === 1 ? "" : "s" }} · peaked at
          <span class="scribble text-sm" style="color: var(--ink)">{{ entry.peakState.toLowerCase() }}</span>
          ({{ entry.peakBAC.toFixed(3) }}%)
        </p>
      </div>

      <p class="print text-center text-[10px] my-2 tracking-widest" style="color: var(--faded)">· · · · · · · · · · · · · · · ·</p>
      <p class="print text-center text-[10px]" style="color: var(--faded)">
        water before bed · the management thanks you
      </p>

      <button
        type="button"
        class="stamp print mx-auto mt-4 block"
        style="color: var(--greenink)"
        @click="store.dismissLastTab()"
      >
        START A NEW TAB
      </button>
    </div>
  </div>
</template>
