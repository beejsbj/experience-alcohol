<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime } from "../utils/bac";
import { CUTOFF_BAC, nextPourMinutes } from "../utils/feelings";
import { DRINKS, VESSELS } from "../constants";
import { triggerHaptic } from "../utils/haptics";
import { scatterRand } from "../utils/scatter";
import GlassTopDown from "./GlassTopDown.vue";
import NapkinSlip from "./NapkinSlip.vue";

// The rubber bar mat at the rail. A glass on it is a pour: tap it and it's
// drunk, drained, and the bartender starts filling the next one — full again
// exactly when the pace says it's time.
const props = defineProps({
  person: { type: Object, required: true },
});

const store = useSessionStore();
const now = useLiveNow();
const napkinOpen = ref(false);
const lifted = ref(null);

const SIZES = { beer: 62, mug: 58, wine: 54, cocktail: 58, shot: 42, flute: 46, highball: 52, can: 50, bottle: 46, custom: 50 };
const VESSEL_KIND = Object.fromEntries(VESSELS.map((v) => [v.key, v.kind]));

const events = computed(() => store.eventsFor(props.person.id));
const bac = computed(() => calculateBACAtTime(events.value, props.person, now.value));
const cutOff = computed(() => bac.value >= CUTOFF_BAC);

// The BAC right after the last pour: how long this glass had to wait, from empty.
const afterLast = computed(() => {
  const last = events.value.at(-1);
  if (!last) return null;
  const t = new Date(last.timestamp).getTime() + 1000;
  return calculateBACAtTime(events.value, props.person, t);
});

const waitFor = (drink) =>
  cutOff.value ? null : nextPourMinutes(bac.value, props.person, drink, props.person.pinnedState);


const glasses = computed(() => {
  const all = [...DRINKS, ...store.session.customDrinks];
  const raw = all.map((drink) => {
    const kind = drink.id ? VESSEL_KIND[drink.vessel] ?? "custom" : drink.type;
    const m = waitFor(drink);
    let fill = 1;
    if (m === null) fill = 0;
    else if (m > 0) {
      const from = afterLast.value === null ? m : nextPourMinutes(afterLast.value, props.person, drink, props.person.pinnedState) ?? m;
      fill = Math.max(0, Math.min(0.97, 1 - m / Math.max(m, from, 1)));
    }
    return {
      drink,
      kind,
      fill,
      ready: m !== null && m <= 0,
      wait: m,
      key: drink.id ?? drink.type,
      base: SIZES[kind] ?? 50,
      label: drink.type.toLowerCase(),
      when: m === null ? "water" : m <= 0 ? "" : m < 60 ? `${Math.ceil(m)}m` : `${Math.floor(m / 60)}h${String(Math.ceil(m % 60)).padStart(2, "0")}`,
      glint: `${(scatterRand(`glint:${drink.type}`)() * 6).toFixed(2)}s`,
    };
  });
  return raw.map((g) => ({ ...g, size: g.base, col: Math.max(g.base, 58) }));
});

// ── Sliding the mat ───────────────────────────────────────────────────────
// Once the house specials outgrow the rail, the mat slides under your thumb
// (no native scrolling anywhere). A drag never counts as a pour.
const viewport = ref(null);
const track = ref(null);
const offset = ref(0);
const minOffset = ref(0);
let slide = null;
let swallowClick = false;

const measure = () => {
  if (!viewport.value || !track.value) return;
  minOffset.value = Math.min(0, viewport.value.clientWidth - track.value.scrollWidth);
  offset.value = Math.max(minOffset.value, Math.min(0, offset.value));
};

const slideStart = (e) => {
  slide = { x0: e.clientX, from: offset.value, moved: false, id: e.pointerId };
};
const slideMove = (e) => {
  if (!slide || e.pointerId !== slide.id) return;
  const dx = e.clientX - slide.x0;
  if (!slide.moved && Math.abs(dx) < 6) return;
  if (!slide.moved) {
    slide.moved = true;
    try {
      viewport.value.setPointerCapture(e.pointerId);
    } catch {
      // synthetic pointer — moves still arrive by bubbling
    }
  }
  let next = slide.from + dx;
  if (next > 0) next *= 0.35;
  if (next < minOffset.value) next = minOffset.value + (next - minOffset.value) * 0.35;
  offset.value = next;
};
const slideEnd = () => {
  if (!slide) return;
  if (slide.moved) {
    swallowClick = true;
    setTimeout(() => (swallowClick = false), 250);
  }
  slide = null;
  offset.value = Math.max(minOffset.value, Math.min(0, offset.value));
};
const onClickCapture = (e) => {
  if (!swallowClick) return;
  e.stopPropagation();
  e.preventDefault();
  swallowClick = false;
};

// A new house special lands at the end of the mat: slide it into view.
watch(
  () => glasses.value.length,
  (n, was) =>
    nextTick(() => {
      measure();
      if (n > was) offset.value = minOffset.value;
    })
);
onMounted(() => {
  nextTick(measure);
  window.addEventListener("resize", measure);
});
onBeforeUnmount(() => window.removeEventListener("resize", measure));

const fade = "linear-gradient(90deg, transparent, #000 18px, #000 calc(100% - 22px), transparent)";

const pour = (g) => {
  lifted.value = g.key;
  setTimeout(() => {
    if (lifted.value === g.key) lifted.value = null;
  }, 260);
  triggerHaptic(g.ready ? "tap" : "warning");
  store.logDrink(props.person.id, g.drink);
};
</script>

<template>
  <div class="pointer-events-none absolute inset-x-0 bottom-0 z-[45] px-[10px]" style="padding-bottom: max(10px, env(safe-area-inset-bottom))">
    <NapkinSlip v-if="napkinOpen" :person="person" @close="napkinOpen = false" />

    <div class="mat pointer-events-auto mx-auto flex items-stretch" style="max-width: 460px; height: 108px">
      <!-- the glasses: slide the mat if there are more than fit -->
      <div
        ref="viewport"
        class="relative min-w-0 flex-1 touch-none overflow-hidden"
        :style="minOffset < 0 ? { WebkitMaskImage: fade, maskImage: fade } : null"
        @pointerdown="slideStart"
        @pointermove="slideMove"
        @pointerup="slideEnd"
        @pointercancel="slideEnd"
        @click.capture="onClickCapture"
      >
        <div
          ref="track"
          class="flex h-full w-max items-center gap-1 pl-3 pr-2"
          :class="minOffset < 0 ? '' : 'mx-auto'"
          :style="{ transform: `translateX(${offset.toFixed(1)}px)`, transition: slide ? 'none' : 'transform 320ms cubic-bezier(.2,1.1,.4,1)' }"
        >
          <button
            v-for="g in glasses"
            :key="g.key"
            type="button"
            class="group relative flex h-full flex-col items-center justify-center"
            :style="{ width: `${g.col}px` }"
            :aria-label="`Pour a ${g.label}${g.when && g.when !== 'water' ? ` — next one's ready in ${g.when}` : ''}`"
            @click="pour(g)"
          >
            <span
              class="relative block transition-transform duration-200"
              :style="{
                transform: lifted === g.key ? 'translateY(-6px) scale(1.12)' : 'none',
                filter: g.ready ? 'none' : 'saturate(0.7) brightness(0.85)',
              }"
            >
              <GlassTopDown :kind="g.kind" :fill="g.fill" :size="g.size" :seed="String(g.key)" />
              <!-- a glint sliding across a full glass: this one's ready -->
              <span
                v-if="g.ready"
                class="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
                aria-hidden="true"
              >
                <span
                  class="absolute inset-y-[-20%] left-0 w-1/3"
                  :style="{
                    background: 'linear-gradient(90deg, transparent, rgba(255,245,225,0.28), transparent)',
                    animation: `glint 5.5s ease-in-out ${g.glint} infinite`,
                  }"
                ></span>
              </span>
            </span>
            <span class="pen mt-1 whitespace-nowrap text-[16px] leading-none" style="color: var(--amber-soft); -webkit-text-stroke: 0">{{ g.label }}</span>
            <span class="print h-[11px] text-[9px] leading-[11px]" style="letter-spacing: 0.08em; color: rgba(232, 163, 60, 0.55)">{{ g.when }}</span>
          </button>
        </div>
      </div>

      <!-- a cocktail napkin for writing your own -->
      <button
        type="button"
        class="relative flex h-full w-[58px] shrink-0 flex-col items-center justify-center border-l border-black/40"
        aria-label="Write your own drink on a napkin"
        @click="napkinOpen = !napkinOpen"
      >
        <span
          class="napkin-mini flex items-center justify-center"
          :style="{ transform: `rotate(${napkinOpen ? 0 : -9}deg)` }"
        >
          <span class="pen text-[26px]" style="color: #6b5a44">+</span>
        </span>
        <span class="pen mt-1.5 text-[16px] leading-none" style="color: var(--amber-soft); -webkit-text-stroke: 0">own</span>
        <span class="h-[11px]"></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.napkin-mini {
  width: 42px;
  height: 42px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.5), transparent 45%),
    repeating-linear-gradient(45deg, rgba(120, 100, 70, 0.08) 0 2px, transparent 2px 5px),
    #f3eee4;
  box-shadow:
    inset 0 0 0 3px #f3eee4,
    inset 0 0 0 4px rgba(120, 100, 70, 0.25),
    3px 6px 8px rgba(0, 0, 0, 0.5);
  border-radius: 2px;
  transition: transform 220ms ease;
}
</style>
