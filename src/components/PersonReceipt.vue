<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime, calculateSingleDrinkBAC } from "../utils/bac";
import { CUTOFF_BAC, feelingFor, nextPourMinutes, stampFor, targetDetails } from "../utils/feelings";
import { DRINKS, MAINTAINABLE_STATES } from "../constants";
import { scatter, scatterRand } from "../utils/scatter";
import { triggerHaptic } from "../utils/haptics";
import WriteOn from "./WriteOn.vue";
import IdentityLine from "./IdentityLine.vue";
import TallyStrokes from "./TallyStrokes.vue";
import RoughChart from "./RoughChart.vue";
import PourTiles from "./PourTiles.vue";
import PushPin from "./PushPin.vue";
import StampVerdict from "./StampVerdict.vue";
import InkArrow from "./InkArrow.vue";
import ColorScribble from "./ColorScribble.vue";

const props = defineProps({
  person: { type: Object, required: true },
  isNew: { type: Boolean, default: false },
});

const store = useSessionStore();
const now = useLiveNow();

// --- BAC / feeling computeds ---
const events = computed(() => store.eventsFor(props.person.id));
const bac = computed(() => calculateBACAtTime(events.value, props.person, now.value));
const rising = computed(
  () => bac.value > calculateBACAtTime(events.value, props.person, now.value - 60000) + 0.00001
);
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

const holdTime = computed(() => {
  if (!target.value) return null;
  const minutes = nextPourMinutes(bac.value, props.person, DRINKS[0], props.person.pinnedState);
  if (minutes === null || minutes <= 0) return null;
  const at = new Date(now.value + minutes * 60000);
  const hh = at.getHours().toString().padStart(2, "0");
  const mm = at.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
});

// --- Receipt log lines (this person only) ---
const DEFAULT_TYPES = new Set(DRINKS.map((d) => d.type));

const receiptLines = computed(() => {
  return [...events.value]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((event) => {
      const delta = calculateSingleDrinkBAC(
        props.person.weight,
        props.person.gender,
        event.abv ?? event.alcoholContent,
        event.volume
      );
      const rand = scatterRand(`line:${event.id}`);
      const dx = (rand() * 4).toFixed(1); // seeded x-drift 0–4px (printed mono)
      return {
        id: event.id,
        time: new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        label: event.type.toUpperCase(),
        delta: `+${delta.toFixed(3)}`,
        isCustom: !DEFAULT_TYPES.has(event.type),
        dx,
      };
    });
});

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

// --- Nickname (shared across all receipts) ---
const updateNickname = (val) => {
  store.session.nickname = val;
};

// --- Whole-paper scatter transform ---
const paperStyle = computed(() => scatter(`paper:${props.person.id}`, { r: 1.2, x: 3, y: 0 }));
</script>

<template>
  <div
    class="receipt-paper mx-auto w-full"
    style="max-width: 420px; animation: receipt-in 280ms ease-out both;"
    :style="{ ...paperStyle }"
  >
    <div class="px-4 pb-8 pt-3">

      <!-- 1. Masthead -->
      <p class="masthead print">
        EXPERIENCE ALCOHOL · TAB No. {{ String(person.id).padStart(3, "0") }}
      </p>
      <ColorScribble :person="person" />

      <!-- 2. Session nickname (editable, shared) -->
      <div class="mt-1" :style="scatter(`nickname:${person.id}`, { r: 2, x: 4, y: 2 })">
        <WriteOn
          :model-value="store.session.nickname"
          :seed="`nick:${store.session.id}`"
          placeholder="tonight"
          class="text-2xl"
          @update:model-value="updateNickname"
        />
      </div>

      <!-- 3. Identity line -->
      <div class="mt-2">
        <IdentityLine :person="person" />
      </div>

      <!-- 4. Drinks: bare tally, annotated by hand -->
      <div class="mt-3 flex items-center gap-1.5" :style="scatter(`tally-row:${person.id}`, { r: 1, x: 3, y: 1 })">
        <TallyStrokes :count="totalDrinks" :seed="`total:${person.id}`" />
        <span class="print text-sm font-bold">{{ totalDrinks }}</span>
        <InkArrow :seed="`drinks:${person.id}`" :width="30" :height="18" />
        <span class="scribble text-sm" style="color: var(--pen)">drinks</span>
      </div>

      <!-- 5. Event log lines (mono, seeded x-drift) -->
      <div class="mt-2">
        <ul v-if="receiptLines.length" class="print space-y-0.5 text-[11px]">
          <li
            v-for="line in receiptLines"
            :key="line.id"
            class="flex items-baseline gap-1.5"
            :style="{ transform: `translateX(${line.dx}px)` }"
          >
            <span style="color: var(--faded)">{{ line.time }}</span>
            <span class="uppercase tracking-wide">{{ line.label }}</span>
            <span class="flex-1 overflow-hidden" aria-hidden="true" style="border-bottom: 1px dotted var(--faded); margin-bottom: 2px;"></span>
            <span>{{ line.delta }}</span>
            <span
              v-if="line.isCustom"
              class="scribble text-[12px]"
              style="color: var(--redpen)"
            >house special</span>
          </li>
        </ul>
        <p v-else class="scribble text-sm" style="color: var(--faded)">tap a drink to start your tab</p>
      </div>

      <!-- 6. Rough chart -->
      <div class="mt-1" :style="scatter(`chart-block:${person.id}`, { r: 0.5, x: 2, y: 1 })">
        <RoughChart :person="person" />
      </div>

      <!-- 7. Feeling block -->
      <div class="mt-3">
        <!-- big feeling state in Caveat -->
        <div :style="scatter(`feeling:${person.id}`, { r: 2.5, x: 5, y: 2 })">
          <div class="flex items-baseline gap-1">
            <span class="scribble text-[11px]" style="color: var(--faded)">feeling:</span>
            <span class="scribble text-3xl font-bold" style="color: var(--pen)">{{ feeling.state.toLowerCase() }}</span>
          </div>
          <!-- red underline SVG -->
          <svg class="-mt-1" width="140" height="10" viewBox="0 0 140 10" aria-hidden="true">
            <path
              d="M4 6 C 30 2, 80 2, 136 5 C 90 5, 35 7, 6 9"
              fill="none"
              stroke="var(--redpen)"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </div>

        <!-- BAC reading -->
        <p
          class="print mt-1 text-base font-bold"
          :style="{ transform: `translateX(${scatterRand('bac-dx:'+person.id)() * 4}px)` }"
        >
          {{ bac.toFixed(3) }}%
          <span class="text-[10px] font-normal" style="color: var(--faded)">est.</span>
        </p>

        <!-- Vibe pin area -->
        <div ref="vibeMenuRef" class="relative mt-2">
          <div
            class="flex items-center gap-2 cursor-pointer"
            :style="scatter(`pin-area:${person.id}`, { r: 1, x: 3, y: 1 })"
            @click="toggleVibeMenu"
          >
            <template v-if="target">
              <PushPin :animate="false" />
              <span class="scribble text-sm" style="color: var(--redpen)">
                hold it!! {{ holdTime ? `next one ~${holdTime}` : 'staying here' }}
              </span>
            </template>
            <template v-else>
              <span class="scribble text-sm" style="color: var(--faded)">pin a vibe?</span>
            </template>
          </div>

          <!-- Vibe menu — torn paper scrap -->
          <div
            v-if="vibeMenuOpen"
            class="absolute left-0 top-full z-10 mt-1 p-3"
            style="background: var(--paper); border: 1.5px solid var(--faded); min-width: 180px;"
          >
            <button
              v-for="(option, i) in MAINTAINABLE_STATES"
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
              style="color: var(--redpen)"
              @click.stop="pinState(null)"
            >
              unpin — free pour
            </button>
          </div>
        </div>

        <!-- Stamp verdict, annotated by hand -->
        <div class="mt-2 flex flex-wrap items-center gap-1.5" :style="scatter(`stamp:${person.id}`, { r: 1, x: 2, y: 1 })">
          <StampVerdict :verdict="stamp" />
          <InkArrow
            :seed="`pour:${person.id}`"
            :width="30"
            :height="18"
            :color="cutOff ? 'var(--redpen)' : 'var(--pen)'"
          />
          <span class="scribble text-sm" :style="{ color: cutOff ? 'var(--redpen)' : 'var(--pen)' }">
            {{ pourCopy }}
          </span>
        </div>
      </div>

      <!-- 8. Pour tiles -->
      <div class="mt-4">
        <PourTiles :person="person" />
      </div>

      <!-- 9. Small print + Close Tab line -->
      <div class="mt-5 pt-3" style="border-top: 1px dashed var(--faded);">
        <p
          class="print text-center text-[10px] leading-5"
          style="color: var(--faded)"
          :style="{ transform: `translateX(${(scatterRand('small-print:'+person.id)() * 2 - 1) * 2}px)` }"
        >
          estimates only · never a reason to drive
        </p>

        <!-- CLOSE TAB inline two-tap -->
        <p
          v-if="hasEvents"
          class="print text-center text-[11px] tracking-widest mt-2 cursor-pointer"
          :style="{
            color: closingConfirm ? 'var(--redpen)' : 'var(--faded)',
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
