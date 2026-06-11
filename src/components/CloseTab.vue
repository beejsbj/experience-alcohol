<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { triggerHaptic } from "../utils/haptics";
import SquiggleDivider from "./SquiggleDivider.vue";

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
  <section>
    <div v-if="hasEvents" class="text-center">
      <button
        type="button"
        class="stamp print tilt-1"
        :style="{ color: confirming ? 'var(--redpen)' : 'var(--ink)' }"
        @click="close"
      >
        {{ confirming ? "SURE? TAP TO CLOSE" : "CLOSE TAB" }}
      </button>
      <button
        v-if="confirming"
        type="button"
        class="print mt-1 block w-full text-[10px] underline"
        style="color: var(--faded)"
        @click="confirming = false"
      >
        keep it open
      </button>
    </div>

    <div v-if="store.lastTab" class="keepsake" role="dialog" aria-label="Closed tab summary">
      <div class="card wob-a w-full max-w-sm p-4">
        <p class="eyebrow print">tab closed · {{ duration(store.lastTab) }}</p>
        <p class="scribble mt-1 text-2xl">{{ store.lastTab.nickname }}</p>
        <SquiggleDivider :seed="5" class="my-2" />
        <p v-if="!store.lastTab.summary.length" class="print text-[11px]" style="color: var(--faded)">
          a quiet one — nothing poured.
        </p>
        <div v-for="entry in store.lastTab.summary" :key="entry.name" class="print mt-2 text-[11px]">
          <p class="font-bold uppercase">{{ entry.name }}</p>
          <p style="color: var(--faded)">
            {{ entry.drinks }} drink{{ entry.drinks === 1 ? "" : "s" }} · peaked at
            <span class="announce" style="color: var(--ink)">{{ entry.peakState.toLowerCase() }}</span>
            ({{ entry.peakBAC.toFixed(3) }}%)
          </p>
        </div>
        <SquiggleDivider :seed="9" class="my-2" />
        <p class="print text-center text-[10px]" style="color: var(--faded)">
          water before bed · the management thanks you
        </p>
        <button
          type="button"
          class="stamp stamp--ink print tilt-2 mx-auto mt-3 block"
          @click="store.dismissLastTab()"
        >
          START A NEW TAB
        </button>
      </div>
    </div>
  </section>
</template>
