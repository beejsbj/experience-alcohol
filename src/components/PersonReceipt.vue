<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime, calculateSingleDrinkBAC } from "../utils/bac";
import { CUTOFF_BAC, feelingFor, nextPourMinutes, stampFor, targetDetails } from "../utils/feelings";
import { DRINKS, MAINTAINABLE_STATES } from "../constants";
import { scatter, scatterRand } from "../utils/scatter";
import { triggerHaptic } from "../utils/haptics";
import IdentityLine from "./IdentityLine.vue";
import TallyStrokes from "./TallyStrokes.vue";
import RoughChart from "./RoughChart.vue";
import PourTiles from "./PourTiles.vue";
import PushPin from "./PushPin.vue";
import StampVerdict from "./StampVerdict.vue";
import InkArrow from "./InkArrow.vue";

const props = defineProps({
  person: { type: Object, required: true },
  isNew: { type: Boolean, default: false },
});

const store = useSessionStore();
const now = useLiveNow();

// --- BAC / feeling computeds ---
const events = computed(() => store.eventsFor(props.person.id));
const bac = computed(() => calculateBACAtTime(events.value, props.person, now.value));
const feeling = computed(() => feelingFor(bac.value));
const stamp = computed(() => stampFor(bac.value, props.person.pinnedState));
const target = computed(() => targetDetails(props.person.pinnedState));
const cutOff = computed(() => bac.value >= CUTOFF_BAC);

const pourCopy = computed(() => {
  if (cutOff.value) return "no more tonight — water + a friend keeping watch";
  const minutes = nextPourMinutes(bac.value, props.person, DRINKS[0], props.person.pinnedState);
  if (minutes === null || minutes <= 0) return "next pour — whenever you like";
  const at = new Date(now.value + minutes * 60000);
  const hh = at.getHours().toString().padStart(2, "0");
  const mm = at.getMinutes().toString().padStart(2, "0");
  return `next pour — ~${hh}:${mm}`;
});

// --- Receipt log lines (this person only) ---
const DEFAULT_TYPES = new Set(DRINKS.map((d) => d.type));

const receiptLines = computed(() => {
  return [...events.value]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((event) => {
      const abv = event.abv ?? event.alcoholContent;
      const delta = calculateSingleDrinkBAC(props.person.weight, props.person.gender, abv, event.volume);
      return {
        id: event.id,
        time: new Date(event.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        type: event.type.toLowerCase(),
        ml: `${Math.round(event.volume * 29.57)}ml`,
        abv: `${Number((abv * 100).toFixed(1))}%`,
        delta: `+${delta.toFixed(3)}`,
        isCustom: !DEFAULT_TYPES.has(event.type),
      };
    });
});

// Fixed column track shared by every ledger row, so the numbers line up
// down the receipt no matter how long a drink name is.
const LEDGER_COLS = "38px minmax(0,1fr) 52px 40px 12px auto";

const totalDrinks = computed(() => events.value.length);

// --- Vibe pin menu ---
const vibeMenuOpen = ref(false);
const vibeMenuRef = ref(null);

const pinState = (stateName) => {
  store.pinVibe(props.person.id, stateName);
  vibeMenuOpen.value = false;
  triggerHaptic("selection");
};

const toggleVibeMenu = () => {
  vibeMenuOpen.value = !vibeMenuOpen.value;
  if (vibeMenuOpen.value) triggerHaptic("selection");
};

const handleDocClick = (e) => {
  if (!vibeMenuRef.value?.contains(e.target)) vibeMenuOpen.value = false;
};
onMounted(() => document.addEventListener("click", handleDocClick));
onBeforeUnmount(() => document.removeEventListener("click", handleDocClick));

// --- Close tab two-tap ---
const closingConfirm = ref(false);
const hasEvents = computed(() => events.value.length > 0);

const handleCloseTab = () => {
  if (!hasEvents.value) return;
  if (!closingConfirm.value) {
    closingConfirm.value = true;
    return;
  }
  store.closeTab();
  closingConfirm.value = false;
  triggerHaptic("success");
};

// --- Left the bar (deactivate this person) ---
const canDeactivate = computed(() => store.activePeople.length > 1);

const leaveBar = () => {
  if (!canDeactivate.value) return;
  store.deactivatePerson(props.person.id);
  triggerHaptic("selection");
};

// --- Whole-paper scatter transform ---
const paperStyle = computed(() => scatter(`paper:${props.person.id}`, { r: 1.2, x: 3, y: 0 }));
</script>

<template>
  <div
    class="receipt-paper mx-auto w-full"
    style="max-width: 420px; animation: receipt-in 280ms ease-out both;"
    :style="{ ...paperStyle, '--pen': person.color }"
  >
    <div class="px-5 pb-8 pt-4">

      <!-- 1. Identity zone: name, sex, weight, ink scribble — all hand-placed -->
      <IdentityLine :person="person" />

      <!-- 2. Drinks: big bare tally, annotated by hand -->
      <div class="mt-2 flex items-center gap-2" :style="scatter(`tally-row:${person.id}`, { r: 1, x: 3, y: 1 })">
        <template v-if="totalDrinks > 0">
          <TallyStrokes :count="totalDrinks" :seed="`total:${person.id}`" :size="30" color="var(--pen)" />
          <InkArrow :seed="`drinks:${person.id}`" :width="34" :height="20" />
          <span class="scribble text-base" style="color: var(--pen)">drinks</span>
        </template>
        <p v-else class="scribble text-base" style="color: var(--faded)">tap a drink to start your tab</p>
      </div>

      <!-- 3. Rough chart -->
      <div class="mt-3" :style="scatter(`chart-block:${person.id}`, { r: 0.5, x: 2, y: 1 })">
        <RoughChart :person="person" />
      </div>

      <!-- 4. Feeling block — the pinned vibe is punched in beside the word -->
      <div class="mt-3">
        <!-- No transform on this wrapper: a transformed ancestor would trap the
             vibe menu's z-index and let later sections paint over it. -->
        <div class="flex items-end gap-2 flex-wrap">
          <!-- big feeling state in Caveat -->
          <div :style="scatter(`feeling:${person.id}`, { r: 2.5, x: 5, y: 2 })">
            <div class="flex items-baseline gap-1">
              <span class="scribble text-[11px]" style="color: var(--faded)">feeling:</span>
              <span class="scribble text-3xl font-bold" style="color: var(--pen)">{{ feeling.state.toLowerCase() }}</span>
            </div>
            <!-- hand underline -->
            <svg class="-mt-1" width="140" height="10" viewBox="0 0 140 10" aria-hidden="true">
              <path
                d="M4 6 C 30 2, 80 2, 136 5 C 90 5, 35 7, 6 9"
                fill="none"
                stroke="var(--pen)"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
          </div>

          <!-- pinned vibe: a punched hole right by the feeling, pin dropped in -->
          <div ref="vibeMenuRef" class="relative" style="margin-bottom: 6px">
            <div
              class="cursor-pointer flex items-center gap-1.5"
              :style="scatter(`pin-area:${person.id}`, { r: 1, x: 3, y: 1 })"
              @click="toggleVibeMenu"
            >
              <!-- the hole -->
              <span class="relative inline-flex" style="width: 18px; height: 18px">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <circle cx="9" cy="9" r="5.5" fill="var(--paper-shade)" stroke="var(--faded)" stroke-width="1" />
                  <path d="M5 11 A 5.5 5.5 0 0 1 9 3.5" fill="none" stroke="rgba(0,0,0,0.16)" stroke-width="1.2" stroke-linecap="round" />
                </svg>
                <!-- pin dropped into the hole when a vibe is held -->
                <span v-if="target" class="absolute" style="top: -13px; left: -2px; z-index: 2">
                  <PushPin :animate="false" />
                </span>
              </span>

              <!-- pinned: short handwritten note. unpinned: prompt + arrow to hole -->
              <template v-if="target">
                <span class="scribble text-base leading-tight" style="color: var(--pen)">
                  hold {{ person.pinnedState.toLowerCase() }}
                </span>
              </template>
              <template v-else>
                <InkArrow :seed="`pin:${person.id}`" dir="left" :width="26" :height="16" />
                <span class="scribble text-sm" style="color: var(--faded)">pin a vibe?</span>
              </template>
            </div>

            <!-- Vibe menu — torn paper scrap -->
            <div
              v-if="vibeMenuOpen"
              class="absolute left-0 top-full z-30 mt-1 p-3"
              style="background: var(--paper); border: 1.5px solid var(--faded); min-width: 180px; box-shadow: 0 4px 14px rgba(0,0,0,0.18);"
            >
              <button
                v-for="option in MAINTAINABLE_STATES"
                :key="option.state"
                type="button"
                class="block w-full text-left py-1"
                :style="scatter(`vibe-opt:${option.state}`, { r: 1.5, x: 3, y: 1 })"
                @click.stop="pinState(option.state)"
              >
                <span class="scribble text-base" style="color: var(--pen)">{{ option.state.toLowerCase() }}</span>
                <span class="print text-[10px] ml-2" style="color: var(--faded)">
                  {{ option.minBAC.toFixed(2) }}–{{ option.maxBAC.toFixed(2) }}%
                </span>
              </button>
              <button
                v-if="target"
                type="button"
                class="block w-full text-left py-1 scribble text-sm mt-1"
                style="color: var(--pen)"
                @click.stop="pinState(null)"
              >
                unpin — free pour
              </button>
            </div>
          </div>
        </div>

        <!-- BAC reading -->
        <p
          class="print mt-1 text-base font-bold"
          :style="{ transform: `translateX(${scatterRand('bac-dx:'+person.id)() * 4}px)` }"
        >
          {{ bac.toFixed(3) }}%
          <span class="text-[10px] font-normal" style="color: var(--faded)">est.</span>
        </p>

        <!-- Stamp verdict at the right margin, annotation pointing at it -->
        <div class="mt-3 flex flex-wrap items-center justify-end gap-1.5" :style="scatter(`stamp:${person.id}`, { r: 1, x: 2, y: 1 })">
          <span class="scribble text-sm text-right" style="color: var(--pen)">
            {{ pourCopy }}
          </span>
          <InkArrow :seed="`pour:${person.id}`" dir="right" :width="30" :height="18" />
          <StampVerdict :verdict="stamp" />
        </div>
      </div>

      <!-- 5. Pour stickers -->
      <div class="mt-4">
        <PourTiles :person="person" />
      </div>

      <!-- 6. The ledger: every pour, printed in aligned columns -->
      <div v-if="receiptLines.length" class="mt-4 pt-2" style="border-top: 1.5px dashed var(--faded);">
        <ul class="print text-[11px]">
          <li
            v-for="line in receiptLines"
            :key="line.id"
            class="items-baseline gap-1.5 py-0.5"
            style="display: grid"
            :style="{ gridTemplateColumns: LEDGER_COLS }"
          >
            <span style="color: var(--faded)">{{ line.time }}</span>
            <span class="truncate" :style="{ color: line.isCustom ? 'var(--pen)' : undefined }">{{ line.type }}</span>
            <span class="text-right" style="color: var(--faded)">{{ line.ml }}</span>
            <span class="text-right" style="color: var(--faded)">{{ line.abv }}</span>
            <span class="scribble text-center" style="color: var(--pen)">{{ line.isCustom ? '✶' : '' }}</span>
            <span class="text-right">{{ line.delta }}</span>
          </li>
        </ul>
      </div>

      <!-- 7. Small print + leave / close lines -->
      <div class="mt-5 pt-3" style="border-top: 1px dashed var(--faded);">
        <p
          class="print text-center text-[10px] leading-5"
          style="color: var(--faded)"
          :style="{ transform: `translateX(${(scatterRand('small-print:'+person.id)() * 2 - 1) * 2}px)` }"
        >
          estimates only · never a reason to drive
        </p>

        <!-- left the bar (only when others remain) -->
        <p
          v-if="canDeactivate"
          class="scribble text-center text-sm mt-2 cursor-pointer"
          style="color: var(--pen); opacity: 0.8"
          :style="{ transform: scatter('leave-bar:'+person.id, { r: 1.4, x: 2, y: 0 }).transform }"
          @click="leaveBar"
        >
          {{ person.name?.trim() || 'they' }} left the bar →
        </p>

        <!-- CLOSE TAB inline two-tap -->
        <p
          v-if="hasEvents"
          class="print text-center text-[11px] tracking-widest mt-2 cursor-pointer"
          :style="{
            color: closingConfirm ? 'var(--pen)' : 'var(--faded)',
            transform: scatter('close-tab:'+person.id, { r: 0.8, x: 2, y: 0 }).transform,
          }"
          @click="handleCloseTab"
        >
          {{ closingConfirm ? '— — SURE? TAP AGAIN — —' : '— — CLOSE TAB — —' }}
        </p>
        <button
          v-if="closingConfirm"
          type="button"
          class="print block mx-auto mt-1 text-[10px] underline"
          style="color: var(--faded)"
          @click="closingConfirm = false"
        >
          keep it open
        </button>
      </div>
    </div>
  </div>
</template>
