<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import emblaCarouselVue from "embla-carousel-vue";
import { useSessionStore } from "../stores/session";
import { scatter } from "../utils/scatter";
import PersonReceipt from "./PersonReceipt.vue";

const emit = defineEmits(["table"]);

const store = useSessionStore();

const people = computed(() => store.activePeople);

// ── Reduced-motion preference ─────────────────────────────────────────────
const reduced =
  typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── Embla setup ───────────────────────────────────────────────────────────
const emblaOptions = computed(() => ({
  loop: people.value.length > 1,
  align: "center",
  skipSnaps: false,
  dragThreshold: 8,
}));

const [emblaRef, emblaApi] = emblaCarouselVue(emblaOptions);

// When activePeople length changes, reInit (options ref already watched by embla)
watch(
  () => people.value.length,
  () => {
    if (emblaApi.value) emblaApi.value.reInit(emblaOptions.value);
  }
);

// ── Slide refs for rotation effect ───────────────────────────────────────
const slideRefs = ref([]);

// ── Sync: embla select → store.focusedPersonId ───────────────────────────
function onEmblaSelect() {
  if (!emblaApi.value) return;
  const idx = emblaApi.value.selectedScrollSnap();
  const p = people.value[idx];
  if (p) store.setFocus(p.id);
}

// ── Rotation effect on scroll (optional, skipped for reduced-motion) ─────
let rafId = null;

function onEmblaScroll() {
  if (reduced || !emblaApi.value) return;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    if (!emblaApi.value) return;
    const engine = emblaApi.value.internalEngine();
    const snaps = engine.scrollSnaps;
    // scrollProgress goes 0→1 across all snaps; compute per-slide offset
    const progress = emblaApi.value.scrollProgress();
    const total = snaps.length;
    snaps.forEach((snap, i) => {
      const slideEl = slideRefs.value[i];
      if (!slideEl) return;
      // Fractional distance of the slide from its resting snap position
      const expectedProgress = i / Math.max(total - 1, 1);
      const delta = progress - expectedProgress;
      const clampedDeg = Math.max(-3, Math.min(3, delta * (total - 1) * 6));
      slideEl.style.setProperty("--slide-rotate", `${clampedDeg.toFixed(2)}deg`);
    });
    rafId = null;
  });
}

// ── Wire embla events once emblaApi is available ──────────────────────────
watch(emblaApi, (api) => {
  if (!api) return;
  api.on("select", onEmblaSelect);
  api.on("scroll", onEmblaScroll);
});

// ── Sync: store.focusedPersonId → embla (external table pickup) ──────────
watch(
  () => store.focusedPersonId,
  (id) => {
    if (!emblaApi.value) return;
    const idx = people.value.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const current = emblaApi.value.selectedScrollSnap();
    if (current !== idx) {
      emblaApi.value.scrollTo(idx, true); // jump — no animation
    }
  }
);

// ── Page dots ─────────────────────────────────────────────────────────────
const selectedIndex = ref(0);

watch(emblaApi, (api) => {
  if (!api) return;
  api.on("select", () => {
    selectedIndex.value = api.selectedScrollSnap();
  });
  // init
  selectedIndex.value = api.selectedScrollSnap();
});

function dotClick(i) {
  if (emblaApi.value) emblaApi.value.scrollTo(i);
}

// ── Hint text ─────────────────────────────────────────────────────────────
const nextPerson = computed(() => {
  const idx = people.value.findIndex((p) => p.id === store.focusedPersonId);
  const nextIdx = (idx + 1) % people.value.length;
  return people.value[nextIdx];
});

const hintStyle = computed(() => scatter(`swipe-hint:${store.session.id}`, { r: 1.5, x: 3, y: 1 }));
const tableHintStyle = computed(() => scatter(`table-hint:${store.session.id}`, { r: 1, x: 2, y: 1 }));

// ── Pull-down-to-table gesture ────────────────────────────────────────────
const deckWrapper = ref(null);

// Per-scroller state — keyed by pointerId to handle multitouch gracefully
let pullState = null; // { pointerId, startY, startX, startTime, engaged }

function getActiveScroller() {
  if (!emblaApi.value) return null;
  const idx = emblaApi.value.selectedScrollSnap();
  const slides = emblaApi.value.slideNodes();
  return slides[idx]?.querySelector("[data-receipt-scroller]") ?? null;
}

function isEmblaPointerDown() {
  if (!emblaApi.value) return false;
  try {
    return emblaApi.value.internalEngine().dragHandler.pointerDown();
  } catch {
    return false;
  }
}

function applyWrapperPull(dy) {
  if (!deckWrapper.value) return;
  const scale = 1 - Math.min(0.06, dy / 2000);
  deckWrapper.value.style.transition = "none";
  deckWrapper.value.style.transform = `translateY(${(dy * 0.6).toFixed(1)}px) scale(${scale.toFixed(4)})`;
}

function resetWrapperSpring() {
  if (!deckWrapper.value) return;
  deckWrapper.value.style.transition = "transform 250ms cubic-bezier(.2,1.3,.4,1)";
  deckWrapper.value.style.transform = "";
}

function fireTableExit() {
  if (!deckWrapper.value) return;
  const h = window.innerHeight;
  deckWrapper.value.style.transition = "transform 200ms ease-in";
  deckWrapper.value.style.transform = `translateY(${h}px) scale(0.95)`;
  setTimeout(() => {
    if (deckWrapper.value) deckWrapper.value.style.transform = "";
    emit("table");
  }, 200);
}

// Touch handlers (passive: false on move so we can preventDefault)
function onScrollerPointerDown(e) {
  if (pullState) return; // ignore second touch
  pullState = {
    pointerId: e.pointerId,
    startY: e.clientY,
    startX: e.clientX,
    startTime: Date.now(),
    engaged: false,
  };
}

function onScrollerPointerMove(e) {
  if (!pullState || pullState.pointerId !== e.pointerId) return;
  if (isEmblaPointerDown()) {
    // embla owns the drag — abort
    pullState = null;
    resetWrapperSpring();
    return;
  }

  const scroller = getActiveScroller();
  if (scroller && scroller.scrollTop > 0) {
    // content is scrolled — don't intercept
    if (pullState.engaged) resetWrapperSpring();
    pullState = null;
    return;
  }

  const dy = e.clientY - pullState.startY;
  const dx = Math.abs(e.clientX - pullState.startX);

  if (!pullState.engaged) {
    // Commit to pull-down only when vertical-dominant and downward
    if (dy > 12 && dy > dx * 1.5) {
      pullState.engaged = true;
    } else if (Math.abs(dy) > 12 || dx > 12) {
      // Something else — abandon
      pullState = null;
      return;
    } else {
      return; // still deciding
    }
  }

  if (dy <= 0) {
    // Went back up above start — cancel
    resetWrapperSpring();
    pullState.engaged = false;
    return;
  }

  // Prevent page scroll while we own the gesture
  e.preventDefault();
  applyWrapperPull(dy);
}

function onScrollerPointerUp(e) {
  if (!pullState || pullState.pointerId !== e.pointerId) return;
  const state = pullState;
  pullState = null;

  if (!state.engaged) return;

  const dy = e.clientY - state.startY;
  const elapsed = Date.now() - state.startTime;
  const velocityDown = dy / elapsed; // px/ms, positive = downward

  if (dy > 110 || velocityDown > 0.6) {
    fireTableExit();
  } else {
    resetWrapperSpring();
  }
}

function onScrollerPointerCancel(e) {
  if (!pullState || pullState.pointerId !== e.pointerId) return;
  pullState = null;
  resetWrapperSpring();
}

// Attach pointer listeners to each active scroller when slides are ready
const scrollerListenerMap = new WeakMap();

function attachScrollerListeners(el) {
  if (!el || scrollerListenerMap.has(el)) return;
  const handlers = {
    pointerdown: onScrollerPointerDown,
    pointermove: onScrollerPointerMove,
    pointerup: onScrollerPointerUp,
    pointercancel: onScrollerPointerCancel,
  };
  el.addEventListener("pointerdown", handlers.pointerdown);
  el.addEventListener("pointermove", handlers.pointermove, { passive: false });
  el.addEventListener("pointerup", handlers.pointerup);
  el.addEventListener("pointercancel", handlers.pointercancel);
  scrollerListenerMap.set(el, handlers);
}

function detachScrollerListeners(el) {
  if (!el) return;
  const handlers = scrollerListenerMap.get(el);
  if (!handlers) return;
  el.removeEventListener("pointerdown", handlers.pointerdown);
  el.removeEventListener("pointermove", handlers.pointermove);
  el.removeEventListener("pointerup", handlers.pointerup);
  el.removeEventListener("pointercancel", handlers.pointercancel);
  scrollerListenerMap.delete(el);
}

// Watch for rendered slides (via template refs) and wire listeners
watch(
  slideRefs,
  (refs) => {
    refs.forEach((slide) => {
      if (!slide) return;
      const scroller = slide.querySelector("[data-receipt-scroller]");
      if (scroller) attachScrollerListeners(scroller);
    });
  },
  { deep: true }
);

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
  // Detach all scroller listeners
  if (emblaApi.value) {
    try {
      emblaApi.value.slideNodes().forEach((slide) => {
        const scroller = slide.querySelector("[data-receipt-scroller]");
        detachScrollerListeners(scroller);
      });
    } catch {
      // already destroyed
    }
  }
  pullState = null;
});
</script>

<template>
  <div class="relative flex flex-col items-center w-full" style="height: 100dvh; padding-top: 16px; padding-bottom: 0;">

    <!-- Deck wrapper — pull-down gesture translates this element -->
    <div
      ref="deckWrapper"
      class="w-full flex-1 overflow-hidden"
      style="will-change: transform;"
    >
      <!-- Embla viewport -->
      <div
        ref="emblaRef"
        class="w-full h-full overflow-hidden select-none"
        style="touch-action: pan-y;"
      >
        <!-- Embla container -->
        <div class="flex h-full" style="align-items: flex-start;">
          <!-- One slide per active person -->
          <div
            v-for="(person, i) in people"
            :key="person.id"
            :ref="(el) => { slideRefs[i] = el; }"
            class="px-3"
            style="flex: 0 0 100%; min-width: 0;"
          >
            <!-- Vertical scroller — PersonReceipt lives inside, stays mounted -->
            <div
              data-receipt-scroller
              style="overflow-y: auto; max-height: calc(100dvh - 84px); overscroll-behavior: contain;"
            >
              <!-- Slide rotation effect via CSS var (set imperatively on scroll) -->
              <div :style="reduced ? {} : { transform: 'rotate(var(--slide-rotate, 0deg))' }">
                <PersonReceipt :person="person" :is-new="false" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Below-deck: page dots + swipe hint + table button -->
    <div class="flex flex-col items-center gap-2 pt-3 pb-4 shrink-0">

      <!-- Page dots (hidden when solo) -->
      <div v-if="people.length > 1" class="flex items-center gap-2">
        <button
          v-for="(p, i) in people"
          :key="p.id"
          type="button"
          class="page-dot transition-all"
          :class="{ 'page-dot--active': i === selectedIndex }"
          :aria-label="`Go to ${p.name}`"
          @click="dotClick(i)"
        />
      </div>

      <!-- Swipe hint + table button -->
      <div class="flex items-center gap-4">
        <span
          v-if="people.length > 1 && nextPerson"
          class="scribble text-xs"
          style="color: rgba(232,163,60,0.7)"
          :style="hintStyle"
        >
          swipe for {{ nextPerson.name?.trim() || '???' }} →
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
