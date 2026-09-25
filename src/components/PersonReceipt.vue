<script setup>
import { computed, onMounted, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime, calculateSingleDrinkBAC } from "../utils/bac";
import { CUTOFF_BAC, feelingFor, nextPourMinutes, stampFor } from "../utils/feelings";
import { clock, peakBAC, standardDrinks, tabNumbers } from "../utils/receipt";
import { DRINKS } from "../constants";
import { scatter, scatterRand } from "../utils/scatter";
import { triggerHaptic } from "../utils/haptics";
import ReceiptPaper from "./ReceiptPaper.vue";
import IdentityLine from "./IdentityLine.vue";
import ColorScribble from "./ColorScribble.vue";
import ThermalChart from "./ThermalChart.vue";
import VibeScale from "./VibeScale.vue";
import StampVerdict from "./StampVerdict.vue";
import Barcode from "./Barcode.vue";
import InkArrow from "./InkArrow.vue";

const props = defineProps({
  person: { type: Object, required: true },
});

const store = useSessionStore();
const now = useLiveNow();

// ── What the printer knows ────────────────────────────────────────────────
const events = computed(() => store.eventsFor(props.person.id));
const bac = computed(() => calculateBACAtTime(events.value, props.person, now.value));
const feeling = computed(() => feelingFor(bac.value));
const stamp = computed(() => stampFor(bac.value, props.person.pinnedState));
const cutOff = computed(() => bac.value >= CUTOFF_BAC);
const seat = computed(() => Math.max(1, store.activePeople.findIndex((p) => p.id === props.person.id) + 1));
const numbers = computed(() => tabNumbers(store.session.id));
const opened = computed(() => clock(store.session.startedAt));

// Doto's own full stop reads as a plus at this weight; print a square dot.
const bacParts = computed(() => bac.value.toFixed(3).split("."));

const pourNote = computed(() => {
  if (cutOff.value) return "water now. that's the night.";
  if (!events.value.length) return "first one's on you";
  const minutes = nextPourMinutes(bac.value, props.person, DRINKS[0], props.person.pinnedState);
  if (minutes === null || minutes <= 0) return "pour whenever you like";
  return `next pour ~${clock(now.value + minutes * 60000)}`;
});

// ── Ledger ────────────────────────────────────────────────────────────────
const DEFAULT_TYPES = new Set(DRINKS.map((d) => d.type));
const mountedAt = ref(Infinity);
onMounted(() => {
  mountedAt.value = Date.now();
});

const lines = computed(() =>
  events.value.map((event) => {
    const abv = event.abv ?? event.alcoholContent;
    const delta = calculateSingleDrinkBAC(props.person.weight, props.person.gender, abv, event.volume);
    return {
      id: event.id,
      time: clock(event.timestamp),
      type: event.type.toUpperCase(),
      ml: `${Math.round(event.volume * 29.57)}ML`,
      abv: `${Number((abv * 100).toFixed(1))}%`,
      delta: `+${delta.toFixed(3).slice(1)}`,
      isCustom: !DEFAULT_TYPES.has(event.type),
      // printed since this paper was picked up: feed it out of the head
      fresh: new Date(event.timestamp).getTime() > mountedAt.value - 1500,
    };
  })
);

const LEDGER_COLS = "34px minmax(0,1fr) 42px 34px 40px";

const totals = computed(() => ({
  pours: events.value.length,
  std: standardDrinks(events.value).toFixed(1),
  peak: peakBAC(events.value, props.person, now.value).toFixed(3),
}));

// ── Footer: leaving, closing ──────────────────────────────────────────────
const canLeave = computed(() => store.activePeople.length > 1);
const leaveBar = () => {
  if (!canLeave.value) return;
  store.deactivatePerson(props.person.id);
  triggerHaptic("selection");
};

const closing = ref(false);
const closeTab = () => {
  if (!events.value.length && !store.session.events.length) return;
  if (!closing.value) {
    closing.value = true;
    triggerHaptic("warning");
    return;
  }
  closing.value = false;
  store.closeTab();
  triggerHaptic("success");
};

// ── Hand placement ────────────────────────────────────────────────────────
const tilt = (key, o) => scatter(`${key}:${props.person.id}`, o);
const feelingTilt = computed(() => tilt("feeling", { r: 2.2, x: 4, y: 1 }));
const underline = computed(() => {
  const rand = scatterRand(`underline:${props.person.id}:${feeling.value.state}`);
  const y0 = 6 + rand() * 3;
  const y1 = 3 + rand() * 3;
  return `M3 ${y0} C 60 ${y1 - 2}, 150 ${y1 + 1}, 232 ${y1} C 170 ${y1 + 3}, 80 ${y0 + 4}, 30 ${y0 + 6}`;
});
</script>

<template>
  <ReceiptPaper :seed="`receipt:${person.id}`" :style="{ '--pen': person.color }">
    <ColorScribble :person="person" />

    <div class="px-[22px] pb-7 pt-7">
      <!-- ── masthead ─────────────────────────────────────────── -->
      <header class="text-center">
        <p class="dots text-[30px]" style="letter-spacing: 0.06em">EXPERIENCE</p>
        <p class="print mt-1.5 text-[10px] font-bold" style="letter-spacing: 0.62em; padding-left: 0.62em">ALCOHOL</p>
        <p class="print mt-1.5 text-[8.5px]" style="letter-spacing: 0.2em; color: var(--print-soft)">
          OPEN LATE · POUR KIND · GO HOME SAFE
        </p>
      </header>

      <div class="rule mt-3"></div>
      <div class="print mt-1.5 flex justify-between text-[9.5px]" style="letter-spacing: 0.1em">
        <span>TBL {{ numbers.table }}</span>
        <span>TAB №{{ numbers.tab }}</span>
        <span>OPEN {{ opened }}</span>
      </div>
      <div class="rule mt-1.5"></div>

      <!-- ── guest ───────────────────────────────────────────── -->
      <section class="mt-3">
        <IdentityLine :person="person" :seat="seat" :pours="events.length" />
      </section>

      <div class="rule--double mt-4"></div>

      <!-- ── how it's going ──────────────────────────────────── -->
      <section class="relative mt-4">
        <div class="origin-left" :style="feelingTilt">
          <p class="pen pen--hard text-[54px] leading-[0.78]">{{ feeling.state.toLowerCase() }}</p>
          <svg class="-mt-0.5 block" width="236" height="16" viewBox="0 0 236 16" aria-hidden="true">
            <path :d="underline" fill="none" stroke="var(--pen)" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>

        <div class="relative mt-3 flex items-end justify-between">
          <div class="flex items-end gap-1.5">
            <span class="dots text-[46px]">{{ bacParts[0] }}<span class="dot-point"></span>{{ bacParts[1] }}</span>
            <span class="print mb-0.5 text-[9px] leading-[1.25]" style="letter-spacing: 0.14em; color: var(--print-soft)">%<br />EST.</span>
          </div>
          <div class="mb-1 mr-1">
            <StampVerdict :verdict="stamp" :size="14" />
          </div>
        </div>

        <div class="mt-2.5 flex items-center gap-1.5" :style="tilt('pour-note', { r: 1.5, x: 3, y: 1 })">
          <p class="pen text-[26px]">{{ pourNote }}</p>
        </div>
      </section>

      <!-- ── the night so far ────────────────────────────────── -->
      <section class="mt-4">
        <ThermalChart :person="person" />
        <div class="mt-1.5">
          <VibeScale :person="person" />
        </div>
        <div v-if="!person.pinnedState" class="-mt-1 flex items-center justify-center gap-1" style="opacity: 0.75">
          <InkArrow :seed="`circle-hint:${person.id}`" dir="left" :width="26" :height="18" />
          <p class="pen text-[19px]">circle one to hold it</p>
        </div>
      </section>

      <!-- ── ledger ──────────────────────────────────────────── -->
      <div class="rule--double mt-4"></div>
      <ul v-if="lines.length" class="print mt-2.5 text-[10.5px]" style="letter-spacing: 0.04em">
        <li
          v-for="line in lines"
          :key="line.id"
          class="grid items-baseline gap-x-1.5 py-[3px]"
          :style="{ gridTemplateColumns: LEDGER_COLS, animation: line.fresh ? 'print-line 520ms steps(12) both' : undefined }"
        >
          <span style="color: var(--print-soft)">{{ line.time }}</span>
          <span class="truncate">
            {{ line.type }}<span v-if="line.isCustom" class="pen ml-1 text-[15px]">✶</span>
          </span>
          <span class="text-right" style="color: var(--print-soft)">{{ line.ml }}</span>
          <span class="text-right" style="color: var(--print-soft)">{{ line.abv }}</span>
          <span class="text-right">{{ line.delta }}</span>
        </li>
      </ul>
      <p v-else class="print mt-3 text-center text-[10px]" style="letter-spacing: 0.3em; color: var(--print-soft)">
        — NO POURS YET —
      </p>

      <div class="rule mt-2.5"></div>
      <div class="print mt-2 text-[10.5px]" style="letter-spacing: 0.08em">
        <div class="flex items-baseline justify-between">
          <span class="font-bold" style="letter-spacing: 0.3em">POURS</span>
          <span class="dots text-[24px]">{{ totals.pours }}</span>
        </div>
        <div class="mt-1 flex justify-between"><span>STD DRINKS</span><span>{{ totals.std }}</span></div>
        <div class="mt-0.5 flex justify-between"><span>PEAK EST.</span><span>{{ totals.peak }}%</span></div>
      </div>
      <div class="rule--double mt-3"></div>

      <!-- ── small print ─────────────────────────────────────── -->
      <div class="mt-4">
        <Barcode :seed="`${store.session.id}:${person.id}`" />
      </div>
      <p class="print mt-3 text-center text-[8.5px] leading-[1.6]" style="letter-spacing: 0.16em; color: var(--print-soft)">
        ESTIMATES ONLY · NEVER A REASON TO DRIVE<br />
        *** DRINK WATER · THANK YOU ***
      </p>

      <!-- ── walking away ────────────────────────────────────── -->
      <div class="mt-5 flex items-center justify-center" v-if="canLeave">
        <button type="button" class="pen text-[22px]" :style="tilt('leave', { r: 2, x: 4, y: 0 })" @click="leaveBar">
          {{ person.name?.trim() || "they" }} left the bar →
        </button>
      </div>

      <button
        v-if="store.session.events.length"
        type="button"
        class="print mt-4 flex w-full items-center gap-2 text-[10px]"
        style="letter-spacing: 0.24em"
        :style="{ color: closing ? 'var(--pen)' : 'var(--print-soft)' }"
        @click="closeTab"
      >
        <span class="rule--dots flex-1"></span>
        <span aria-hidden="true" class="text-[13px]">✂</span>
        <span>{{ closing ? "SURE? TAP TO CLOSE" : "CLOSE THE TAB" }}</span>
        <span class="rule--dots flex-1"></span>
      </button>
      <button
        v-if="closing"
        type="button"
        class="pen mx-auto mt-2 block text-[20px]"
        @click="closing = false"
      >
        no — keep it open
      </button>
    </div>
  </ReceiptPaper>
</template>
