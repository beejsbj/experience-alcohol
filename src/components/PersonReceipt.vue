<script setup>
import { computed, onMounted, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useRoomStore } from "../stores/room";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime, calculateSingleDrinkBAC } from "../utils/bac";
import { CUTOFF_BAC, feelingFor, nextPourMinutes, stampFor } from "../utils/feelings";
import { clock, peakBAC, pourCount, standardDrinks, tabNumbers } from "../utils/receipt";
import { friendMarks, friendNote } from "../utils/doodles";
import { barLine } from "../utils/barkeep";
import { DRINKS } from "../constants";
import { scatter } from "../utils/scatter";
import { triggerHaptic } from "../utils/haptics";
import ReceiptPaper from "./ReceiptPaper.vue";
import IdentityLine from "./IdentityLine.vue";
import IntroFlow from "./IntroFlow.vue";
import ColorScribble from "./ColorScribble.vue";
import ThermalChart from "./ThermalChart.vue";
import VibeScale from "./VibeScale.vue";
import VerdictNote from "./VerdictNote.vue";
import FeelingUnderline from "./FeelingUnderline.vue";
import Doodle from "./Doodle.vue";
import Barcode from "./Barcode.vue";
import InkArrow from "./InkArrow.vue";
import BarNote from "./BarNote.vue";

// One person's tab: thermal paper the printer fills with facts, which the
// whole table then writes all over.
const props = defineProps({
  person: { type: Object, required: true },
});

const store = useSessionStore();
const room = useRoomStore();
const now = useLiveNow();

// At a shared table: whose phone is holding this receipt right now.
const heldBy = computed(() => {
  if (!room.inRoom) return null;
  if (props.person.id === room.myPersonId) return "yours — on this phone";
  if (room.heldElsewhere.has(props.person.id)) return "on their phone";
  return null;
});

// ── What the printer knows ────────────────────────────────────────────────
const events = computed(() => store.eventsFor(props.person.id));
const pours = computed(() => pourCount(events.value));
const bac = computed(() => calculateBACAtTime(events.value, props.person, now.value));
const feeling = computed(() => feelingFor(bac.value));
const verdict = computed(() => stampFor(bac.value, props.person.pinnedState));
const cutOff = computed(() => bac.value >= CUTOFF_BAC);
const seat = computed(() => Math.max(1, store.activePeople.findIndex((p) => p.id === props.person.id) + 1));
const numbers = computed(() => tabNumbers(store.session.id));
const opened = computed(() => clock(store.session.startedAt));

// Doto's own full stop reads as a plus at this weight; print a square dot.
const bacParts = computed(() => bac.value.toFixed(3).split("."));

const pourNote = computed(() => {
  if (cutOff.value) return "water now. that's the night.";
  if (!pours.value) return "first one's on you";
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
      delta: delta > 0 ? `+${delta.toFixed(3).slice(1)}` : "—",
      isCustom: !DEFAULT_TYPES.has(event.type),
      // printed since this paper was picked up: feed it out of the head
      fresh: new Date(event.timestamp).getTime() > mountedAt.value - 1500,
    };
  })
);

const LEDGER_COLS = "34px minmax(0,1fr) 42px 34px 40px";

// Peer clocks may be ahead: the peak follows pours as they come due. Only the
// latest landed pour can move it, so the full history scan runs when that
// changes, not on every clock tick.
const landedAt = computed(() => {
  let latest = 0;
  for (const e of events.value) {
    const t = (e.t ?? new Date(e.timestamp).getTime()) + 1000;
    if (t <= now.value && t > latest) latest = t;
  }
  return latest;
});
const landedPeak = computed(() => peakBAC(events.value, props.person, landedAt.value));
const peak = computed(() => Math.max(bac.value, landedPeak.value));
const totals = computed(() => ({
  pours: pours.value,
  std: standardDrinks(events.value).toFixed(1),
  peak: peak.value.toFixed(3),
}));

// ── The table writes on it ────────────────────────────────────────────────
const friends = computed(() => store.activePeople.filter((p) => p.id !== props.person.id && !p.needsIntro));
const SLOTS = 8;
const marks = computed(() => {
  const inks = [...new Set(friends.value.map((f) => f.color))];
  const placed = friendMarks(props.person.id, store.session.events.length, inks, props.person.color, SLOTS);
  return Object.fromEntries(placed.map((m) => [m.slot, { name: m.name, ink: m.ink, rot: m.rot, size: m.size }]));
});
const note = computed(() => {
  if (!events.value.length) return null;
  const n = friendNote(props.person.id, verdict.value, friends.value.map((f) => ({ name: f.name, color: f.color })));
  return { text: n.text, from: n.from?.name?.trim() || "the bar", ink: n.from?.color ?? props.person.color };
});

// ── The bar has a word ────────────────────────────────────────────────────
// Everything it reads is bucketed first, so a new line is written at a real
// moment (a pour, a verdict, a new hour), never on the second-hand tick.
const lastEvent = computed(() => events.value.at(-1) ?? null);
const sinceLastBucket = computed(() => {
  if (!lastEvent.value) return Infinity;
  const m = (now.value - lastEvent.value.t) / 60000;
  return m < 12 ? 0 : m < 45 ? 15 : 60;
});
const hour = computed(() => new Date(now.value).getHours());
const bacBucket = computed(() => Math.round(bac.value * 100) / 100);
const waters = computed(() => events.value.length - pours.value);
const mixed = computed(() => [...new Set(events.value.filter((e) => (e.abv ?? e.alcoholContent) > 0).map((e) => e.type))].join(","));
const barCtx = computed(() => ({
  pours: pours.value,
  waters: waters.value,
  lastType: lastEvent.value?.type,
  lastIsCustom: lastEvent.value ? !DEFAULT_TYPES.has(lastEvent.value.type) : false,
  sinceLastMin: sinceLastBucket.value,
  types: mixed.value ? mixed.value.split(",") : [],
  verdict: verdict.value,
  state: feeling.value.state,
  bac: bacBucket.value,
  pinned: props.person.pinnedState,
  falling: sinceLastBucket.value >= 45,
  hour: hour.value,
  name: props.person.name,
  tab: numbers.value.tab,
}));
const beat = computed(() => {
  const c = barCtx.value;
  return `${props.person.id}:${c.pours}:${c.waters}:${c.verdict}:${c.state}:${c.hour}:${c.sinceLastMin}:${c.pinned ?? ""}:${c.lastType ?? ""}`;
});
const bar = computed(() => barLine(barCtx.value, beat.value));
const barClosing = computed(() => barLine({ ...barCtx.value, closing: true }, `${props.person.id}:closing:${pours.value}`));

// Tap the feeling to have another go at underlining it.
const underlineNudge = ref(0);
// The hand only changes every ~10 minutes of drift; don't redraw it per tick.
const underlineBac = computed(() => Math.floor(bac.value / 0.0025) * 0.0025);
const reUnderline = () => {
  underlineNudge.value += 1;
  triggerHaptic("selection");
};

// ── Footer: leaving, closing ──────────────────────────────────────────────
const canLeave = computed(() => store.activePeople.length > 1);
const leaveBar = () => {
  if (!canLeave.value) return;
  store.deactivatePerson(props.person.id);
  triggerHaptic("selection");
};

const closing = ref(false);
const closeTab = () => {
  if (!store.session.events.length) return;
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
</script>

<template>
  <ReceiptPaper :seed="`receipt:${person.id}`" :style="{ '--pen': person.color }">
    <ColorScribble v-if="!person.needsIntro" :person="person" />

    <div class="px-[22px] pb-7 pt-7">
      <!-- ── masthead ─────────────────────────────────────────── -->
      <header class="relative text-center">
        <p class="dots text-[30px]" style="letter-spacing: 0.06em">EXPERIENCE</p>
        <p class="print mt-1.5 text-[10px] font-bold" style="letter-spacing: 0.62em; padding-left: 0.62em">ALCOHOL</p>
        <p class="print mt-1.5 text-[8.5px]" style="letter-spacing: 0.2em; color: var(--print-soft)">
          OPEN LATE · POUR KIND · GO HOME SAFE
        </p>
        <Doodle v-if="marks[0]" class="absolute -left-2 -top-4" :seed="`${person.id}:0`" v-bind="marks[0]" />
        <Doodle v-if="marks[1]" class="absolute right-3 top-7" :seed="`${person.id}:1`" v-bind="marks[1]" />
      </header>

      <div class="rule mt-3"></div>
      <div class="print mt-1.5 flex justify-between text-[9.5px]" style="letter-spacing: 0.1em">
        <span>TBL {{ numbers.table }}</span>
        <span>TAB №{{ numbers.tab }}</span>
        <span>OPEN {{ opened }}</span>
      </div>
      <div class="rule mt-1.5"></div>

      <!-- ── a new face: ask, don't assume ───────────────────── -->
      <IntroFlow v-if="person.needsIntro" :person="person" :seat="seat" />

      <template v-else>
        <!-- ── guest ─────────────────────────────────────────── -->
        <section class="relative mt-3">
          <IdentityLine :person="person" :seat="seat" :pours="pours" />
          <p v-if="heldBy" class="pen mt-1 text-[18px]" style="opacity: 0.6">{{ heldBy }}</p>
          <Doodle v-if="marks[2]" class="absolute -bottom-5 right-24" :seed="`${person.id}:2`" v-bind="marks[2]" />
        </section>

        <div class="rule--double mt-4"></div>

        <!-- ── how it's going ────────────────────────────────── -->
        <section class="relative mt-4">
          <button type="button" class="block origin-left text-left" :style="feelingTilt" aria-label="Underline it again" @click="reUnderline">
            <p class="pen pen--hard text-[54px] leading-[0.78]">{{ feeling.word }}</p>
            <FeelingUnderline :seed="`${person.id}:${feeling.state}`" :bac="underlineBac" :nudge="underlineNudge" class="mt-0.5" />
          </button>
          <Doodle v-if="marks[3]" class="absolute -top-5 right-4" :seed="`${person.id}:3`" v-bind="marks[3]" />

          <div class="relative mt-3 flex items-end justify-between gap-2">
            <div class="flex items-end gap-1.5">
              <span class="dots text-[46px]">{{ bacParts[0] }}<span class="dot-point"></span>{{ bacParts[1] }}</span>
              <span class="print mb-0.5 text-[9px] leading-[1.25]" style="letter-spacing: 0.14em; color: var(--print-soft)">%<br />EST.</span>
            </div>
            <div class="mb-1 mr-1">
              <VerdictNote :verdict="verdict" :seed="String(person.id)" :size="30" />
            </div>
          </div>

          <!-- the pen's timing on the left; the bar's word in the margin on the right -->
          <div class="mt-2.5 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <p class="pen text-[26px]" :style="tilt('pour-note', { r: 1.5, x: 3, y: 1 })">{{ pourNote }}</p>
            <div class="ml-auto max-w-[53%] pt-1.5 text-right">
              <BarNote :text="bar.text" :seed="`bar:${person.id}`" :size="13.5" />
            </div>
          </div>
        </section>

        <!-- ── the night so far ──────────────────────────────── -->
        <section class="relative mt-4">
          <ThermalChart :person="person" />
          <div class="mt-1.5">
            <VibeScale :person="person" />
          </div>
          <div v-if="!person.pinnedState" class="-mt-1 flex items-center justify-center gap-1" style="opacity: 0.75">
            <InkArrow :seed="`circle-hint:${person.id}`" dir="left" :width="26" :height="18" />
            <p class="pen text-[19px]">circle one to hold it</p>
          </div>
        </section>

        <!-- ── ledger ────────────────────────────────────────── -->
        <div class="rule--double mt-4"></div>
        <ul v-if="lines.length" class="print mt-2.5 text-[10.5px]" style="letter-spacing: 0.04em">
          <li
            v-for="line in lines"
            :key="line.id"
            class="grid items-baseline gap-x-1.5 py-[3px]"
            :style="{ gridTemplateColumns: LEDGER_COLS, animation: line.fresh ? 'print-line 520ms steps(12) backwards' : undefined }"
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
        <div class="print relative mt-2 text-[10.5px]" style="letter-spacing: 0.08em">
          <div class="flex items-baseline justify-between">
            <span class="font-bold" style="letter-spacing: 0.3em">POURS</span>
            <span class="dots text-[24px]">{{ totals.pours }}</span>
          </div>
          <div class="mt-1 flex justify-between"><span>STD DRINKS</span><span>{{ totals.std }}</span></div>
          <div class="mt-0.5 flex justify-between"><span>PEAK EST.</span><span>{{ totals.peak }}%</span></div>
          <!-- a friend leans over the totals and writes something -->
          <div
            v-if="note"
            class="pointer-events-none absolute left-[27%] top-0 max-w-[46%]"
            :style="{ ...tilt('friend-note', { r: 3, x: 3, y: 2 }), color: note.ink }"
          >
            <p class="pen text-[18px] leading-[1]">
              {{ note.text }}<br />
              <span class="text-[15px]" style="opacity: 0.8">— {{ note.from }}</span>
            </p>
          </div>
        </div>
        <div class="rule--double mt-3"></div>

        <!-- ── small print ───────────────────────────────────── -->
        <div class="relative mt-4">
          <Barcode :seed="`${store.session.id}:${person.id}`" />
          <Doodle v-if="marks[5]" class="absolute left-0 top-1" :seed="`${person.id}:5`" v-bind="marks[5]" />
          <Doodle v-if="marks[6]" class="absolute right-2 top-0" :seed="`${person.id}:6`" v-bind="marks[6]" />
        </div>
        <p class="print mt-3 text-center text-[8.5px] leading-[1.6]" style="letter-spacing: 0.16em; color: var(--print-soft)">
          ESTIMATES ONLY · NEVER A REASON TO DRIVE<br />
          *** DRINK WATER · THANK YOU ***
        </p>

        <!-- ── walking away ──────────────────────────────────── -->
        <div class="relative mt-5 flex items-center justify-center">
          <button v-if="canLeave" type="button" class="pen text-[22px]" :style="tilt('leave', { r: 2, x: 4, y: 0 })" @click="leaveBar">
            {{ person.name?.trim() || "they" }} left the bar →
          </button>
          <Doodle v-if="marks[4]" class="absolute -top-2 left-2" :seed="`${person.id}:4`" v-bind="marks[4]" />
          <Doodle v-if="marks[7]" class="absolute -top-3 right-2" :seed="`${person.id}:7`" v-bind="marks[7]" />
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
        <div v-if="closing" class="mt-2 flex items-start justify-between gap-3">
          <div class="max-w-[58%]">
            <BarNote :text="barClosing.text" :seed="`bar-closing:${person.id}`" :size="13.5" />
          </div>
          <button type="button" class="pen shrink-0 text-[20px]" @click="closing = false">no — keep it open</button>
        </div>
      </template>
    </div>
  </ReceiptPaper>
</template>
