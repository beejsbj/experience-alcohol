<script setup>
import { computed, ref, watch } from "vue";
import { useSessionStore } from "../stores/session";
import { useRoomStore } from "../stores/room";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime } from "../utils/bac";
import { CUTOFF_BAC, feelingFor, nextPourMinutes, stampFor, targetDetails } from "../utils/feelings";
import { DRINKS } from "../constants";
import { windowModel } from "../utils/window";
import RoseWindow from "./RoseWindow.vue";
import RoseIcon from "./RoseIcon.vue";
import PourRow from "./PourRow.vue";
import VibeSheet from "./VibeSheet.vue";
import PersonMenu from "./PersonMenu.vue";

const emit = defineEmits(["table"]);
const store = useSessionStore();
const room = useRoomStore();
const now = useLiveNow();

const person = computed(() => store.person(store.focusedPersonId) ?? store.activePeople[0]);
const events = computed(() => store.eventsFor(person.value.id));
const bac = computed(() => calculateBACAtTime(events.value, person.value, now.value));
const feeling = computed(() => feelingFor(bac.value));
const stamp = computed(() => stampFor(bac.value, person.value.pinnedState));
const target = computed(() => targetDetails(person.value.pinnedState));
const glass = computed(() => windowModel(events.value, person.value, { now: now.value }).glass);

const plateClass = computed(() => ({
  "ON PACE": "plate--gold",
  "EASY NOW": "",
  "SLOW DOWN": "plate--blood",
  "CUT OFF": "plate--blood",
}[stamp.value]));

const nextPour = computed(() => {
  if (bac.value >= CUTOFF_BAC) return "no more tonight — water, and a friend keeping watch";
  const m = nextPourMinutes(bac.value, person.value, DRINKS[0], person.value.pinnedState);
  if (m === null || m <= 0) return events.value.length ? "next round whenever you like" : "tap a glass to begin";
  const at = new Date(now.value + m * 60000);
  return `next beer ~${at.getHours().toString().padStart(2, "0")}:${at.getMinutes().toString().padStart(2, "0")}`;
});

// The light behind the window takes the colour of what you're drinking.
const backlight = computed(() => {
  const strength = Math.min(1, bac.value / 0.1);
  const c = glass.value ?? "#6b5f7a";
  return {
    background: `radial-gradient(closest-side, color-mix(in srgb, ${c} ${Math.round(18 + strength * 34)}%, transparent), transparent)`,
  };
});

const displayName = computed(() => person.value.name?.trim() || "who's this?");
const seatNote = (p) => {
  if (!room.inRoom) return null;
  if (p.id === room.myPersonId) return "this phone";
  if (room.heldElsewhere.has(p.id)) return "their phone";
  return null;
};

const vibeOpen = ref(false);
const menuOpen = ref(false);
const windowEl = ref(null);

// Someone new gets asked their name straight away.
const addPerson = () => {
  store.addPerson({ name: "" });
  menuOpen.value = true;
};

// --- Swipe the window sideways to the next person ---
const dx = ref(0);
const direction = ref(1);
let drag = null;
const onDown = (e) => {
  if (store.activePeople.length < 2) return;
  drag = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, locked: false };
};
const onMove = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const mx = e.clientX - drag.x;
  const my = e.clientY - drag.y;
  if (!drag.locked) {
    if (Math.abs(mx) < 8) return;
    if (Math.abs(my) > Math.abs(mx)) { drag = null; return; }
    drag.locked = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  dx.value = mx;
};
const onUp = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const velocity = dx.value / Math.max(1, performance.now() - drag.t);
  if (drag.locked && (Math.abs(dx.value) > 80 || Math.abs(velocity) > 0.6)) step(dx.value < 0 ? 1 : -1);
  dx.value = 0;
  drag = null;
};
const step = (delta) => {
  const people = store.activePeople;
  const i = people.findIndex((p) => p.id === person.value.id);
  direction.value = delta;
  store.setFocus(people[(i + delta + people.length) % people.length].id);
};
const pick = (id) => {
  const people = store.activePeople;
  direction.value = people.findIndex((p) => p.id === id) > people.findIndex((p) => p.id === person.value.id) ? 1 : -1;
  store.setFocus(id);
};

watch(() => person.value.id, () => { vibeOpen.value = false; });
</script>

<template>
  <div class="night">
    <!-- Header: whose window, everyone else's, the table -->
    <header class="night__head">
      <button type="button" class="plate plate--dark slab name" @click="menuOpen = true">
        <span>{{ displayName }}</span>
      </button>
      <div class="flex items-center gap-2">
        <button
          v-for="p in store.activePeople"
          :key="p.id"
          type="button"
          class="roundel"
          :class="{ 'is-current': p.id === person.id }"
          :aria-label="`${p.name || 'someone'}'s window`"
          @click="pick(p.id)"
        >
          <RoseIcon :person="p" :events="store.eventsFor(p.id)" :now="now" />
        </button>
        <button type="button" class="roundel roundel--add slab" aria-label="someone new" @click="addPerson">+</button>
        <button type="button" class="table-btn slab" @click="emit('table')">
          table<span v-if="room.inRoom" class="table-btn__dot" :class="{ 'is-live': room.status === 'connected' }" />
        </button>
      </div>
    </header>

    <div class="spacer" aria-hidden="true" />

    <!-- The window -->
    <div
      class="stage"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    >
      <div class="backlight" :style="backlight" aria-hidden="true" />
      <Transition :name="direction > 0 ? 'slide-next' : 'slide-prev'" mode="out-in">
        <div
          :key="person.id"
          ref="windowEl"
          class="stage__window"
          :style="{ transform: `translateX(${dx}px) rotate(${dx / 40}deg)`, transition: dx ? 'none' : undefined }"
        >
          <RoseWindow :person="person" :events="events" :now="now" intro />
        </div>
      </Transition>
      <p v-if="seatNote(person)" class="seat mono">{{ seatNote(person) }}</p>
    </div>

    <!-- How it feels -->
    <section class="feeling" :key="`f-${person.id}`">
      <button type="button" class="feeling__word display" @click="vibeOpen = true">
        {{ events.length ? feeling.state.toLowerCase() : "an empty glass" }}
      </button>
      <div class="feeling__meta mono">
        <span>{{ bac.toFixed(3) }}% <em class="not-italic" style="color: var(--bone-3)">est.</em></span>
        <button type="button" class="vibe-chip" :class="{ 'is-held': target }" @click="vibeOpen = true">
          {{ target ? `✦ holding ${target.state.toLowerCase()}` : "✧ hold a vibe" }}
        </button>
      </div>
    </section>

    <!-- The verdict -->
    <section v-if="events.length" class="verdict">
      <p :key="stamp" class="plate slab verdict__plate" :class="plateClass" style="animation: stamp-in 420ms var(--ease-out) both">
        <span>{{ stamp }}</span>
      </p>
      <p class="mono verdict__next">{{ nextPour }}</p>
    </section>
    <p v-else class="mono verdict__next px-6" style="color: var(--bone-2)">{{ nextPour }}</p>

    <div class="spacer spacer--low" aria-hidden="true" />

    <PourRow class="night__pours" :person="person" :target="windowEl" />

    <p class="fineprint mono">estimates only · never a reason to drive</p>

    <VibeSheet v-if="vibeOpen" :person="person" @close="vibeOpen = false" />
    <PersonMenu v-if="menuOpen" :key="`m-${person.id}`" :person="person" @close="menuOpen = false" />
  </div>
</template>

<style scoped>
.night {
  position: relative;
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding-top: max(0.9rem, env(safe-area-inset-top));
  padding-bottom: max(0.8rem, env(safe-area-inset-bottom));
  overflow-y: auto;
  height: 100dvh;
}
.night > * {
  flex-shrink: 0;
}
.night__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0 1.1rem 0 1.4rem;
  animation: rise-in 360ms var(--ease-out) both;
}
.name {
  font-size: 1.35rem;
  max-width: 44vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 0;
}
.roundel {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  opacity: 0.55;
  transition: opacity 200ms, transform 200ms var(--ease-spring);
}
.roundel.is-current {
  opacity: 1;
  transform: scale(1.15);
  box-shadow: 0 0 0 2px var(--gold), 0 0 14px rgba(231, 184, 76, 0.35);
}
.roundel--add {
  border: 1.5px dashed var(--bone-3);
  color: var(--bone-2);
  font-size: 1rem;
  opacity: 1;
}
.table-btn {
  position: relative;
  background: none;
  border: 0;
  color: var(--bone);
  font-size: 1rem;
  padding: 0 0 0 0.35rem;
  letter-spacing: 0.08em;
}
.table-btn__dot {
  position: absolute;
  top: -3px;
  right: -8px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--bone-3);
}
.table-btn__dot.is-live {
  background: var(--gold);
  box-shadow: 0 0 8px var(--gold);
}
.stage {
  position: relative;
  padding: 0.9rem 1.1rem 0;
  touch-action: pan-y;
  user-select: none;
}
.backlight {
  position: absolute;
  inset: -12% -20%;
  pointer-events: none;
  transition: background 900ms ease;
}
.stage__window {
  position: relative;
  /* As big as the screen allows while the pours stay in reach */
  width: min(100%, max(236px, calc(100dvh - 340px)));
  margin: 0 auto;
  transition: transform 380ms var(--ease-spring);
  animation: window-in 700ms var(--ease-out) backwards;
}
.seat {
  position: absolute;
  right: 1.4rem;
  bottom: -0.2rem;
  font-size: 11px;
  color: var(--bone-2);
}
.feeling {
  position: relative;
  margin-top: -0.4rem;
  padding: 0 1.4rem;
  animation: rise-in 420ms var(--ease-out) 120ms both;
}
.feeling__word {
  display: block;
  background: none;
  border: 0;
  padding: 0;
  color: var(--bone);
  text-align: left;
  font-size: clamp(2.6rem, 13vw, 4.1rem);
  line-height: 0.92;
  font-weight: 500;
  text-shadow: 0 2px 30px rgba(0, 0, 0, 0.8);
}
.feeling__meta {
  margin-top: 0.55rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}
.vibe-chip {
  background: none;
  border: 0;
  color: var(--bone-2);
  font: inherit;
  padding: 0;
}
.vibe-chip.is-held {
  color: var(--gold);
}
.verdict {
  display: flex;
  align-items: center;
  gap: 1.1rem;
  padding: 1.1rem 1.4rem 0.2rem 1.6rem;
}
.verdict__plate {
  font-size: 1.5rem;
  flex: none;
}
.verdict__next {
  font-size: 12px;
  line-height: 1.4;
  color: var(--bone-2);
}
.spacer {
  flex: 1 1 0;
  min-height: 0.4rem;
}
.spacer--low {
  flex-grow: 1.6;
}
.night__pours {
  padding-top: 0.6rem;
}
.fineprint {
  text-align: center;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--bone-3);
  margin-top: 0.7rem;
}
.slide-next-enter-from { opacity: 0; transform: translateX(60px) rotate(4deg); }
.slide-next-leave-to { opacity: 0; transform: translateX(-60px) rotate(-4deg); }
.slide-prev-enter-from { opacity: 0; transform: translateX(-60px) rotate(-4deg); }
.slide-prev-leave-to { opacity: 0; transform: translateX(60px) rotate(4deg); }
.slide-next-enter-active, .slide-next-leave-active,
.slide-prev-enter-active, .slide-prev-leave-active {
  transition: opacity 220ms ease, transform 260ms var(--ease-out);
}
@keyframes window-in {
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
}
</style>
