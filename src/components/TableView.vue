<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useRoomStore } from "../stores/room";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime } from "../utils/bac";
import { feelingFor, stampFor } from "../utils/feelings";
import { scatter } from "../utils/scatter";
import TallyStrokes from "./TallyStrokes.vue";
import PushPin from "./PushPin.vue";
import RoomSlip from "./RoomSlip.vue";

const emit = defineEmits(["pickup"]);
const store = useSessionStore();
const room = useRoomStore();
const slipOpen = ref(false);
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

// At a shared table, the first receipt you pick up is yours.
const needsSeat = computed(() => room.inRoom && !room.awaitingTable && !room.myPersonId);

const pickUp = (id) => {
  if (needsSeat.value) room.claim(id);
  store.setFocus(id);
  emit("pickup");
};

const openRoom = async () => {
  if (!room.inRoom) await room.startRoom();
  slipOpen.value = true;
};

const addPerson = () => {
  const id = store.addPerson({ name: "" });
  if (needsSeat.value) room.claim(id);
  emit("pickup");
};

// Heading scatter
const headingStyle = scatter(`table-heading:${store.session.id}`, { r: 2, x: 4, y: 2 });
const inviteStyle = scatter("table-invite", { r: 3, x: 6, y: 2 });

const roomLine = computed(() => {
  if (!room.inRoom) return "pull up a chair for a friend →";
  if (room.status === "connected") return `${room.peerCount + 1} phones at this table`;
  return "table open · waiting…";
});

const seatNote = (personId) => {
  if (!room.inRoom) return null;
  if (personId === room.myPersonId) return "this phone";
  if (room.heldElsewhere.has(personId)) return "their phone";
  return null;
};
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

    <button
      type="button"
      class="scribble -mt-4 mb-5 block text-lg"
      style="color: rgba(232,163,60,0.85)"
      :style="inviteStyle"
      @click="openRoom"
    >{{ roomLine }}</button>

    <p v-if="room.awaitingTable" class="scribble mt-10 text-center text-3xl" style="color: rgba(232,163,60,0.9)">
      finding the table…
    </p>
    <p v-if="room.awaitingTable" class="scribble mt-3 text-center text-lg" style="color: rgba(232,163,60,0.6)">
      keep their app open too
    </p>

    <p v-if="needsSeat" class="scribble mb-4 text-2xl" style="color: rgba(232,163,60,0.95)">
      which one's you? tap your receipt — or tear a new one ↓
    </p>

    <!-- Mini receipts stacked with scatter -->
    <div v-if="!room.awaitingTable" class="relative flex flex-col" style="gap: 0;">
      <div
        v-for="(receipt, index) in miniReceipts"
        :key="receipt.person.id"
        class="receipt-paper cursor-pointer relative"
        style="
          max-width: 75%;
          padding: 10px 14px 14px;
          z-index: 0;
        "
        :style="{
          ...receipt.scatterStyle,
          marginTop: index === 0 ? '0' : '14px',
          marginLeft: `${16 + (index % 3) * 24}px`,
          zIndex: index,
          animation: `scrap-in 260ms ease-out ${index * 50}ms both`,
        }"
        @click="pickUp(receipt.person.id)"
      >
        <!-- Person name -->
        <p
          class="scribble text-xl font-bold leading-none"
          :style="{ color: receipt.person.color }"
        >{{ receipt.person.name?.trim() || '???' }}</p>

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

        <!-- Whose phone holds this receipt -->
        <p
          v-if="seatNote(receipt.person.id)"
          class="scribble absolute bottom-3 right-3 text-base"
          :style="{ color: receipt.person.id === room.myPersonId ? 'var(--pen)' : 'var(--faded)' }"
        >{{ seatNote(receipt.person.id) }}</p>

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
          margin-top: 20px;
          margin-left: 40px;
        "
        :style="scatter(`stub:${store.session.id}`, { r: 3, x: 10, y: 4 })"
        @click="addPerson"
      >
        <p class="scribble text-lg" style="color: var(--faded)">tear a new one +</p>
      </div>
    </div>

    <RoomSlip v-if="slipOpen" @close="slipOpen = false" />
  </div>
</template>
