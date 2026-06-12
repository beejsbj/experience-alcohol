<script setup>
import { computed } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime } from "../utils/bac";
import { feelingFor, stampFor } from "../utils/feelings";
import { scatter } from "../utils/scatter";
import TallyStrokes from "./TallyStrokes.vue";
import PushPin from "./PushPin.vue";

const emit = defineEmits(["pickup"]);
const store = useSessionStore();
const now = useLiveNow();

const people = computed(() => store.activePeople);

const tableTime = computed(() =>
  new Date(now.value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
);

const miniReceipts = computed(() =>
  people.value.map((person) => {
    const events = store.eventsFor(person.id);
    const bac = calculateBACAtTime(events, person, now.value);
    const feeling = feelingFor(bac);
    const stamp = stampFor(bac, person.pinnedState);
    const warn = stamp === "SLOW DOWN" || stamp === "CUT OFF";
    const scatterStyle = scatter(`table:${person.id}`, { r: 4, x: 14, y: 8 });
    return {
      person,
      bac,
      feeling,
      stamp,
      warn,
      scatterStyle,
      drinkCount: events.length,
    };
  })
);

const pickUp = (id) => {
  store.setFocus(id);
  emit("pickup");
};

const addPerson = () => {
  store.addPerson({});
  emit("pickup");
};

// Heading scatter
const headingStyle = scatter(`table-heading:${store.session.id}`, { r: 2, x: 4, y: 2 });
</script>

<template>
  <div
    class="relative w-full min-h-dvh overflow-y-auto px-6 py-6"
    style="background: transparent"
  >
    <!-- Scribbled heading -->
    <p class="scribble text-2xl mb-6" style="color: rgba(232,163,60,0.85)" :style="headingStyle">
      the table · {{ tableTime }}
    </p>

    <!-- Mini receipts stacked with scatter -->
    <div class="relative flex flex-col" style="gap: 0;">
      <div
        v-for="(receipt, index) in miniReceipts"
        :key="receipt.person.id"
        class="receipt-paper cursor-pointer relative"
        style="
          max-width: 280px;
          padding: 10px 14px 14px;
          margin-bottom: -20px;
          z-index: 0;
        "
        :style="{
          ...receipt.scatterStyle,
          marginLeft: `${16 + (index % 3) * 24}px`,
          zIndex: index,
        }"
        @click="pickUp(receipt.person.id)"
      >
        <!-- Person name -->
        <p
          class="scribble text-xl font-bold leading-none"
          :style="{ color: receipt.person.color }"
        >{{ receipt.person.name }}</p>

        <!-- Big feeling state -->
        <p
          class="scribble text-3xl font-bold mt-0.5 leading-tight"
          style="color: var(--pen)"
        >{{ receipt.feeling.state.toLowerCase() }}</p>

        <!-- Tally + count -->
        <div class="flex items-center gap-2 mt-1">
          <TallyStrokes :count="receipt.drinkCount" :seed="`table-tally:${receipt.person.id}`" />
          <span class="print text-[11px]">{{ receipt.drinkCount }}</span>
        </div>

        <!-- Printed BAC -->
        <p class="print text-sm font-bold mt-1">{{ receipt.bac.toFixed(3) }}%</p>

        <!-- Warning line -->
        <p v-if="receipt.warn" class="print text-[11px] mt-1" style="color: var(--redpen)">
          ⚠ {{ receipt.stamp }}
        </p>

        <!-- Push pin if pinned -->
        <div v-if="receipt.person.pinnedState" class="absolute top-2 right-2">
          <PushPin :animate="false" />
        </div>
      </div>

      <!-- Tear a new one stub -->
      <div
        class="receipt-paper cursor-pointer"
        style="
          max-width: 240px;
          padding: 10px 14px 16px;
          border: 2px dashed var(--faded);
          background: transparent;
          box-shadow: none;
          margin-top: 32px;
          margin-left: 40px;
        "
        :style="scatter(`stub:${store.session.id}`, { r: 3, x: 10, y: 4 })"
        @click="addPerson"
      >
        <p class="scribble text-lg" style="color: var(--faded)">tear a new one +</p>
      </div>
    </div>
  </div>
</template>
