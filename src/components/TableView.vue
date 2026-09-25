<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useRoomStore } from "../stores/room";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime } from "../utils/bac";
import { feelingFor, stampFor } from "../utils/feelings";
import { clock } from "../utils/receipt";
import { scatterRand } from "../utils/scatter";
import ReceiptPaper from "./ReceiptPaper.vue";
import TallyStrokes from "./TallyStrokes.vue";
import StampVerdict from "./StampVerdict.vue";
import RoomSlip from "./RoomSlip.vue";

// Everyone's tab, tossed on the table where you can see the lot at once.
// Tap a receipt to pick it up; the coaster invites a friend's phone; the
// printer at the end of the bar tears off a fresh tab for a newcomer.
const emit = defineEmits(["pickup"]);
const store = useSessionStore();
const room = useRoomStore();
const slipOpen = ref(false);
const now = useLiveNow();

const people = computed(() => store.activePeople);

const scraps = computed(() =>
  people.value.map((person, i) => {
    const events = store.eventsFor(person.id);
    const bac = calculateBACAtTime(events, person, now.value);
    const rand = scatterRand(`table:${person.id}`);
    return {
      person,
      seat: i + 1,
      bac: bac.toFixed(3).split("."),
      feeling: feelingFor(bac).state.toLowerCase(),
      stamp: stampFor(bac, person.pinnedState),
      pours: events.length,
      // tossed, not placed
      style: {
        transform: `translate(${((rand() * 2 - 1) * 8).toFixed(1)}px, ${((rand() * 2 - 1) * 6).toFixed(1)}px) rotate(${((rand() * 2 - 1) * 5).toFixed(2)}deg)`,
        marginTop: i % 2 === 1 ? "44px" : "0",
        animation: `scrap-in 320ms cubic-bezier(.2,1.2,.4,1) ${i * 60}ms both`,
        "--pen": person.color,
      },
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

const seatNote = (personId) => {
  if (!room.inRoom) return null;
  if (personId === room.myPersonId) return "this phone";
  if (room.heldElsewhere.has(personId)) return "their phone";
  return null;
};

const coasterLabel = computed(() => {
  if (!room.inRoom) return "+";
  if (room.status === "connected") return String(room.peerCount + 1);
  return "…";
});
const coasterRing = computed(() =>
  room.inRoom
    ? "PHONES AT THIS TABLE · PEER TO PEER · "
    : "PULL UP A CHAIR · BRING A FRIEND · "
);
</script>

<template>
  <div class="relative h-dvh w-full overflow-y-auto px-5 pb-16" style="padding-top: calc(18px + env(safe-area-inset-top))">
    <div class="mx-auto" style="max-width: 640px">
    <!-- heading, in chalk-pale pen on the wood -->
    <header class="flex items-start justify-between">
      <div style="transform: rotate(-2deg)">
        <p class="pen text-[46px]" style="color: var(--amber); -webkit-text-stroke: 0.4px currentColor">the table</p>
        <p class="print mt-1 text-[10px]" style="letter-spacing: 0.3em; color: var(--amber-soft)">
          {{ clock(now) }} · {{ people.length }} {{ people.length === 1 ? "TAB" : "TABS" }} OPEN
        </p>
      </div>

      <!-- the coaster: bring another phone to the table -->
      <button type="button" class="coaster shrink-0" :aria-label="room.inRoom ? 'Show the table invite' : 'Invite a friend to the table'" @click="openRoom">
        <svg viewBox="0 0 100 100" width="92" height="92" aria-hidden="true">
          <defs>
            <path id="coaster-ring" d="M50 50 m-37 0 a37 37 0 1 1 74 0 a37 37 0 1 1 -74 0" />
          </defs>
          <circle cx="50" cy="50" r="47" fill="#ecdfc6" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="#9c2f22" stroke-width="1.6" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="#9c2f22" stroke-width="1" />
          <text font-size="8.4" fill="#9c2f22" class="print" style="letter-spacing: 0.12em; font-weight: 700">
            <textPath href="#coaster-ring">{{ coasterRing }}</textPath>
          </text>
          <text x="50" y="62" text-anchor="middle" class="pen" font-size="34" fill="#9c2f22">{{ coasterLabel }}</text>
        </svg>
      </button>
    </header>

    <p v-if="room.awaitingTable" class="pen mt-24 text-center text-[40px]" style="color: var(--amber)">finding the table…</p>
    <p v-if="room.awaitingTable" class="pen mt-2 text-center text-[24px]" style="color: var(--amber-soft)">keep their app open too</p>

    <p v-if="needsSeat" class="pen mt-5 text-[28px] leading-tight" style="color: var(--amber)">
      which one's you? tap your receipt — or tear a fresh one off the printer
    </p>

    <!-- the receipts, tossed down -->
    <div v-if="!room.awaitingTable" class="mt-6 grid items-start gap-x-4 gap-y-3"
      style="grid-template-columns: repeat(auto-fill, minmax(146px, 1fr))">
      <button
        v-for="scrap in scraps"
        :key="scrap.person.id"
        type="button"
        class="block text-left"
        :style="scrap.style"
        :aria-label="`Pick up ${scrap.person.name || 'this'} receipt`"
        @click="pickUp(scrap.person.id)"
      >
        <ReceiptPaper :seed="`mini:${scrap.person.id}`" :teeth="14" :depth="5">
          <div class="px-3.5 pb-5 pt-5">
            <p class="print text-[8px]" style="letter-spacing: 0.24em; color: var(--print-soft)">GUEST {{ String(scrap.seat).padStart(2, "0") }}</p>
            <p class="pen pen--hard mt-1 truncate text-[34px] leading-[0.85]">{{ scrap.person.name?.trim() || "???" }}</p>
            <div class="rule mt-2"></div>
            <p class="pen mt-2 text-[22px] leading-[0.9]">{{ scrap.feeling }}</p>
            <p class="dots mt-2 text-[26px]">{{ scrap.bac[0] }}<span class="dot-point"></span>{{ scrap.bac[1] }}</p>
            <div class="mt-2 flex min-h-[16px] items-center justify-between">
              <TallyStrokes :count="scrap.pours" :seed="`table-tally:${scrap.person.id}`" :size="14" />
              <span v-if="!scrap.pours" class="print text-[8px]" style="letter-spacing: 0.2em; color: var(--faded)">NO POURS</span>
            </div>
            <div class="mt-2.5">
              <StampVerdict :verdict="scrap.stamp" :size="10" />
            </div>
            <p v-if="seatNote(scrap.person.id)" class="pen mt-2 text-right text-[18px]" :style="{ opacity: scrap.person.id === room.myPersonId ? 1 : 0.55 }">
              {{ seatNote(scrap.person.id) }}
            </p>
          </div>
        </ReceiptPaper>
      </button>
    </div>

    <!-- the receipt printer at the end of the bar -->
    <button
      v-if="!room.awaitingTable"
      type="button"
      class="printer mx-auto mt-12 block"
      aria-label="Tear off a new tab for someone"
      @click="addPerson"
    >
      <span class="printer__paper">
        <span class="pen text-[22px]" style="color: #5b5146">tear one off +</span>
      </span>
      <span class="printer__body">
        <span class="printer__slot"></span>
        <span class="printer__led"></span>
        <span class="print printer__brand">THERMAL · 80MM</span>
      </span>
    </button>

    </div>

    <RoomSlip v-if="slipOpen" @close="slipOpen = false" />
  </div>
</template>

<style scoped>
.coaster {
  margin-top: -2px;
  border-radius: 50%;
  filter: drop-shadow(3px 8px 8px rgba(0, 0, 0, 0.55));
  transform: rotate(11deg);
  transition: transform 200ms ease;
}
.coaster:active {
  transform: rotate(11deg) scale(0.95);
}

.printer {
  position: relative;
  width: 230px;
  padding-top: 46px;
}
.printer__paper {
  position: absolute;
  left: 28px;
  right: 28px;
  top: 0;
  height: 62px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12px;
  background: linear-gradient(180deg, #f7f3ea, #e9e2d3);
  clip-path: polygon(0 6px, 8% 0, 16% 5px, 26% 1px, 36% 6px, 47% 0, 58% 5px, 68% 1px, 79% 6px, 90% 0, 100% 5px, 100% 100%, 0 100%);
  transition: transform 220ms ease;
}
.printer:active .printer__paper {
  transform: translateY(-6px);
}
.printer__body {
  position: relative;
  display: block;
  height: 58px;
  border-radius: 12px 12px 16px 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent 30%),
    linear-gradient(180deg, #2c2a28, #151412);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.08) inset,
    0 14px 26px rgba(0, 0, 0, 0.6);
}
.printer__slot {
  position: absolute;
  left: 20px;
  right: 20px;
  top: 8px;
  height: 5px;
  border-radius: 3px;
  background: #050505;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.08);
}
.printer__led {
  position: absolute;
  right: 20px;
  bottom: 14px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7ddc8a;
  box-shadow: 0 0 8px #7ddc8a;
}
.printer__brand {
  position: absolute;
  left: 20px;
  bottom: 11px;
  font-size: 8px;
  letter-spacing: 0.3em;
  color: rgba(255, 255, 255, 0.28);
}
</style>
