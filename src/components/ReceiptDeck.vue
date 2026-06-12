<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { scatter } from "../utils/scatter";
import PersonReceipt from "./PersonReceipt.vue";

const emit = defineEmits(["table"]);

const store = useSessionStore();

// Swipe physics state
const dx = ref(0);
const animatingOut = ref(false);
const animDir = ref(0); // -1 left, +1 right
const reduced =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

// Pointer tracking
let startX = 0;
let startY = 0;
let startTime = 0;
let tracking = ref(false); // true once we've committed to horizontal swipe

const people = computed(() => store.activePeople);
const focused = computed(() => store.person(store.focusedPersonId));
const focusedIndex = computed(() => people.value.findIndex((p) => p.id === store.focusedPersonId));

const nextPerson = computed(() => {
  const idx = (focusedIndex.value + 1) % people.value.length;
  return people.value[idx];
});
const prevPerson = computed(() => {
  const idx = (focusedIndex.value - 1 + people.value.length) % people.value.length;
  return people.value[idx];
});

const paperTransform = computed(() => {
  if (animatingOut.value) {
    return `translateX(${animDir.value * 110}%) rotate(${animDir.value * 8}deg)`;
  }
  if (tracking.value && Math.abs(dx.value) > 0) {
    return `translateX(${dx.value}px) rotate(${(dx.value * 0.04).toFixed(2)}deg)`;
  }
  return "";
});

const paperTransition = computed(() => {
  if (animatingOut.value || !tracking.value) return "transform 220ms ease-out";
  return "none";
});

// Pointer handlers
const onPointerDown = (e) => {
  startX = e.clientX;
  startY = e.clientY;
  startTime = Date.now();
  dx.value = 0;
  tracking.value = false;
};

const onPointerMove = (e) => {
  if (animatingOut.value) return;
  const ddx = e.clientX - startX;
  const ddy = e.clientY - startY;
  if (!tracking.value) {
    // Commit: horizontal if |dx| > |dy| * 1.5
    if (Math.abs(ddx) > Math.abs(ddy) * 1.5 && Math.abs(ddx) > 6) {
      tracking.value = true;
      e.preventDefault(); // prevent page scroll once we commit
    } else if (Math.abs(ddy) > Math.abs(ddx) * 1.5 && Math.abs(ddy) > 6) {
      // vertical scroll — don't intercept
      return;
    }
    return;
  }
  e.preventDefault();
  dx.value = ddx;
};

const onPointerUp = (e) => {
  if (!tracking.value) return;
  const ddx = e.clientX - startX;
  const elapsed = Date.now() - startTime;
  const velocity = Math.abs(ddx) / elapsed; // px/ms
  const threshold = window.innerWidth * 0.3;

  if (people.value.length > 1 && (Math.abs(ddx) > threshold || velocity > 0.5)) {
    // Advance
    const dir = ddx < 0 ? -1 : 1;
    if (reduced) {
      // No animation — just switch
      store.setFocus(dir < 0 ? nextPerson.value.id : prevPerson.value.id);
      dx.value = 0;
    } else {
      animDir.value = dir < 0 ? -1 : 1; // paper exits in the direction of drag
      animatingOut.value = true;
      setTimeout(() => {
        store.setFocus(dir < 0 ? nextPerson.value.id : prevPerson.value.id);
        animatingOut.value = false;
        dx.value = 0;
      }, 220);
    }
  } else {
    // Spring back
    dx.value = 0;
  }
  tracking.value = false;
};

const onPointerCancel = () => {
  tracking.value = false;
  dx.value = 0;
};

// Swipe hint scatter
const hintStyle = computed(() => scatter(`swipe-hint:${store.session.id}`, { r: 1.5, x: 3, y: 1 }));
const tableHintStyle = computed(() => scatter(`table-hint:${store.session.id}`, { r: 1, x: 2, y: 1 }));
</script>

<template>
  <div class="relative flex flex-col items-center w-full" style="height: 100dvh; padding-top: 16px; padding-bottom: 0;">

    <!-- Receipt paper with swipe handling -->
    <div
      class="w-full px-3 touch-pan-y select-none"
      :style="{
        transform: paperTransform,
        transition: paperTransition,
        willChange: 'transform',
      }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <PersonReceipt v-if="focused" :person="focused" :is-new="false" />
    </div>

    <!-- Below-paper area: page dots + swipe hint + table button -->
    <div class="flex flex-col items-center gap-2 pt-3 pb-4 shrink-0">

      <!-- Page dots -->
      <div v-if="people.length > 1" class="flex items-center gap-2">
        <div
          v-for="p in people"
          :key="p.id"
          class="page-dot transition-all"
          :class="{ 'page-dot--active': p.id === store.focusedPersonId }"
        ></div>
      </div>

      <!-- Swipe hint + table link -->
      <div class="flex items-center gap-4">
        <span
          v-if="people.length > 1 && nextPerson"
          class="scribble text-xs"
          style="color: rgba(232,163,60,0.7)"
          :style="hintStyle"
        >
          swipe for {{ nextPerson.name }} →
        </span>
        <button
          type="button"
          class="scribble text-xs"
          style="color: rgba(232,163,60,0.85)"
          :style="tableHintStyle"
          @click="emit('table')"
        >
          the table ↓
        </button>
      </div>
    </div>
  </div>
</template>
