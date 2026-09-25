<script>
// Filter and gradient ids must be unique per window: the table shows many.
let windows = 0;
</script>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { angleAt, archSpandrel, bandPath, linePath, polar, uprightRotation } from "../utils/dial";
import { LEAD_RINGS, feelingScale, haloRange, paneBands, traceryCells, windowModel } from "../utils/window";
import { targetDetails } from "../utils/feelings";
import { scatterRand } from "../utils/scatter";

// One person's night as a backlit rose window. Pure drawing: everything comes
// from their pours, the time, and the vibe they pinned.
const props = defineProps({
  person: { type: Object, required: true },
  events: { type: Array, required: true },
  now: { type: Number, required: true },
  detail: { type: String, default: "full" }, // 'full' | 'mini'
  // Play the entrance: tracery draws in, then the night's panes light in order.
  intro: { type: Boolean, default: false },
  // Draw where the night drifts from here (off for a finished night).
  showForecast: { type: Boolean, default: true },
});

const C = 200;
const RIM_OUT = 196;
const RIM_IN = 164;
const BAND_OUT = 158;
const HUB = 38;
const SPRING = 122; // where each petal's pointed arch springs from its mullions
const TAU = Math.PI * 2;
const scale = feelingScale({ inner: HUB, outer: BAND_OUT });
const geo = { cx: C, cy: C };
const full = computed(() => props.detail === "full");

windows += 1;
const uid = `rw${windows}`;

const model = computed(() => windowModel(props.events, props.person, { now: props.now }));

// A pour flares the pane it lands in: bumping this re-creates that pane's light.
const flare = ref(0);
watch(
  () => props.events.length,
  (n, was) => { if (n > was) flare.value += 1; }
);

const panes = computed(() => {
  const wedges = model.value.wedges;
  return wedges.flatMap((w, wi) => {
    const latest = wi === wedges.length - 1;
    return paneBands(w.bac).map(([b0, b1], i) => ({
      key: `${w.id}:${i}${latest ? `:${flare.value}` : ""}`,
      d: bandPath(w.t0, w.t1, scale(b0), scale(b1), geo),
      fill: w.glass,
      opacity: w.shades[i],
      latest,
      delay: 380 + wi * 55 + i * 30,
    }));
  });
});

// Panes present when the window first appears arrive with the entrance (or
// not at all); only panes lit afterwards flare.
const born = new Set(panes.value.map((p) => p.key));
const ready = ref(false);
const isNew = (key) => ready.value && !born.has(key);

// The unlit window: every cell of the tracery as dark coloured glass.
const HALF_HOUR = 1800000;
const dayZero = new Date(2000, 0, 1, 0, 0).getTime();
const unlit = traceryCells().map((c) => ({
  key: c.key,
  d: bandPath(dayZero + c.slot * HALF_HOUR, dayZero + (c.slot + 1) * HALF_HOUR, scale(c.from), scale(c.to), geo),
  fill: c.glass,
  opacity: c.shade,
  delay: 40 + c.ring * 45 + ((c.slot * 7) % 24) * 6,
}));

// Stone: twelve mullions (one per hour), each petal ending in a pointed arch.
const mullions = Array.from({ length: 12 }, (_, h) => {
  const a = (h / 12) * TAU;
  const p0 = polar(C, C, HUB, a);
  const p1 = polar(C, C, BAND_OUT, a);
  return { key: h, x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y };
});
// Lead between the half hours runs up to each arch's point.
const leads = Array.from({ length: 12 }, (_, h) => {
  const a = ((h + 0.5) / 12) * TAU;
  const p0 = polar(C, C, HUB, a);
  const p1 = polar(C, C, BAND_OUT, a);
  return { key: h, x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y };
});
const spandrels = Array.from({ length: 12 }, (_, h) => ({
  key: h,
  d: archSpandrel((h / 12) * TAU, ((h + 1) / 12) * TAU, SPRING, BAND_OUT, geo),
}));

const leadRings = LEAD_RINGS.map((r) => scale(r));

const NUMERALS = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
const numerals = NUMERALS.map((label, h) => {
  const a = (h / 12) * TAU;
  const p = polar(C, C, RIM_IN + 9, a); // inner half of the rim; jewels take the outer
  return { label, x: p.x, y: p.y, rotate: uprightRotation(a) };
});

// Every pour is a jewel set into the rim at the moment it was poured.
const jewels = computed(() =>
  model.value.pours.map((p, i) => {
    const rand = scatterRand(`jewel:${p.id}`);
    const r = RIM_OUT - 10 + (rand() - 0.5) * 4;
    const at = polar(C, C, r, angleAt(p.time));
    return { key: p.id, x: at.x, y: at.y, fill: p.glass, r: 4 + rand() * 1.4, delay: 700 + i * 60 };
  })
);

const halo = computed(() => {
  const range = haloRange(targetDetails(props.person.pinnedState));
  if (!range) return null;
  const r0 = scale(range.from);
  const r1 = scale(range.to);
  return { r0, r1, mid: (r0 + r1) / 2, width: r1 - r0 };
});

const forecast = computed(() =>
  full.value && props.showForecast ? linePath(model.value.forecast, { ...geo, scale }) : ""
);

const hand = computed(() => {
  const a = angleAt(props.now);
  const tip = polar(C, C, RIM_IN - 2, a);
  const base = polar(C, C, HUB, a);
  const here = polar(C, C, scale(model.value.bac), a);
  return { tip, base, here };
});

const hubGlass = computed(() => (model.value.bac > 0 ? model.value.glass : null));
const foils = [0, 1, 2, 3].map((i) => polar(C, C, HUB * 0.42, (i / 4) * TAU + Math.PI / 4));

// The entrance plays once; when its last animation ends the window settles.
const playing = ref(props.intro);
const svg = ref(null);
let alive = true;
onMounted(async () => {
  requestAnimationFrame(() => { ready.value = true; });
  if (!props.intro) return;
  await nextTick();
  const running = (svg.value?.getAnimations?.({ subtree: true }) ?? []).filter(
    (a) => a.effect?.getTiming().iterations !== Infinity
  );
  await Promise.allSettled(running.map((a) => a.finished));
  if (alive) playing.value = false;
});
onBeforeUnmount(() => { alive = false; });

const ms = (n) => ({ "--d": `${n}ms` });
</script>

<template>
  <svg
    ref="svg"
    viewBox="0 0 400 400"
    class="rose"
    :class="[`rose--${detail}`, { 'is-intro': playing }]"
    role="img"
    :aria-label="`${person.name || 'someone'}'s night as a rose window`"
  >
    <defs>
      <filter :id="`${uid}-mottle`" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" :seed="7" result="noise" />
        <feColorMatrix in="noise" type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 0.75" result="shade" />
        <feComposite in="shade" in2="SourceGraphic" operator="in" result="shadeIn" />
        <feBlend in="shadeIn" in2="SourceGraphic" mode="multiply" />
      </filter>
      <filter :id="`${uid}-bleed`" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="12" />
      </filter>
      <!-- Light through each pane is brightest at its heart -->
      <radialGradient :id="`${uid}-sheen`" cx="50%" cy="50%" r="62%">
        <stop offset="0%" stop-color="#fff8e6" stop-opacity="0.38" />
        <stop offset="55%" stop-color="#fff8e6" stop-opacity="0.08" />
        <stop offset="100%" stop-color="#fff8e6" stop-opacity="0" />
      </radialGradient>
      <radialGradient :id="`${uid}-dark`" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="#1d1826" />
        <stop offset="100%" stop-color="#0c0a11" />
      </radialGradient>
      <!-- Dust in the unlit glass: darker toward the rim -->
      <radialGradient :id="`${uid}-dusk`" cx="50%" cy="50%" r="50%">
        <stop offset="30%" stop-color="#07060a" stop-opacity="0" />
        <stop offset="100%" stop-color="#07060a" stop-opacity="0.55" />
      </radialGradient>
    </defs>

    <!-- The stone and the unlit glass -->
    <circle :cx="C" :cy="C" :r="RIM_OUT" :fill="`url(#${uid}-dark)`" />

    <!-- Light spilling through the lit panes onto the stone -->
    <g v-if="full && panes.length" :filter="`url(#${uid}-bleed)`" class="bleed">
      <path v-for="p in panes" :key="`b${p.key}`" :d="p.d" :fill="p.fill" />
    </g>

    <!-- Unlit glass: the window is always made, the night only lights it -->
    <g class="unlit-glass">
      <path
        v-for="c in unlit"
        :key="`u${c.key}`"
        :d="c.d"
        :fill="c.fill"
        :fill-opacity="c.opacity"
        :style="ms(c.delay)"
        class="unlit"
      />
      <circle :cx="C" :cy="C" :r="BAND_OUT" :fill="`url(#${uid}-dusk)`" class="dusk" />
    </g>

    <!-- The pinned vibe: a faint gold band under the glass -->
    <circle v-if="halo" :cx="C" :cy="C" :r="halo.mid" :stroke-width="halo.width" class="halo__band" />

    <!-- The night's glass, lit -->
    <g :filter="full ? `url(#${uid}-mottle)` : undefined">
      <path
        v-for="p in panes"
        :key="p.key"
        :d="p.d"
        :fill="p.fill"
        :fill-opacity="p.opacity"
        :style="ms(p.delay)"
        class="pane"
        :class="{ 'is-new': isNew(p.key) }"
      />
    </g>
    <g class="sheen">
      <path
        v-for="p in panes"
        :key="`s${p.key}`"
        :d="p.d"
        :fill="`url(#${uid}-sheen)`"
        :style="ms(p.delay)"
        class="pane-sheen"
        :class="{ 'is-new': isNew(p.key) }"
      />
    </g>

    <!-- Tracery: lead between the half hours, stone mullions, pointed arches -->
    <g class="tracery">
      <circle v-for="(r, i) in leadRings" :key="`ring${i}`" :cx="C" :cy="C" :r="r" pathLength="1" class="lead-ring" />
      <line v-for="l in leads" :key="`l${l.key}`" v-bind="l" pathLength="1" class="lead" />
      <line v-for="m in mullions" :key="`mo${m.key}`" v-bind="m" pathLength="1" class="mullion__lead" />
      <line v-for="m in mullions" :key="`m${m.key}`" v-bind="m" pathLength="1" class="mullion" />
      <path v-for="s in spandrels" :key="`sp${s.key}`" :d="s.d" class="spandrel" />
    </g>

    <!-- The pinned vibe: its rings of lead are gilded -->
    <g v-if="halo" class="halo">
      <circle :cx="C" :cy="C" :r="halo.r0" class="halo__lead" />
      <circle :cx="C" :cy="C" :r="halo.r1" class="halo__lead" />
      <circle :cx="C" :cy="C" :r="halo.r0" class="halo__gilt" />
      <circle :cx="C" :cy="C" :r="halo.r1" class="halo__gilt" />
    </g>

    <!-- Glass not yet made: where the night drifts from here -->
    <path v-if="forecast" :d="forecast" class="forecast" />

    <!-- The rim: stone ring, hours in numerals, a jewel for every pour -->
    <circle :cx="C" :cy="C" :r="(RIM_IN + RIM_OUT) / 2" :stroke-width="RIM_OUT - RIM_IN" class="rim" />
    <circle :cx="C" :cy="C" :r="RIM_IN" class="rim__edge" />
    <circle :cx="C" :cy="C" :r="RIM_OUT - 0.5" class="rim__edge" />
    <g v-if="full" class="numerals">
      <text
        v-for="n in numerals"
        :key="n.label"
        :x="n.x"
        :y="n.y"
        :transform="`rotate(${n.rotate} ${n.x} ${n.y})`"
      >{{ n.label }}</text>
    </g>
    <circle
      v-for="j in jewels"
      :key="j.key"
      :cx="j.x"
      :cy="j.y"
      :r="j.r"
      :fill="j.fill"
      :style="{ ...ms(j.delay), color: j.fill }"
      class="jewel"
      :class="{ 'is-new': isNew(j.key) }"
    />

    <!-- Now -->
    <g class="now">
      <line :x1="hand.base.x" :y1="hand.base.y" :x2="hand.tip.x" :y2="hand.tip.y" class="hand" />
      <circle v-if="model.bac > 0" :cx="hand.here.x" :cy="hand.here.y" r="5.5" :fill="model.glass" class="here" />
    </g>

    <!-- A pour sends a ring of light out from the hub -->
    <circle
      v-if="flare && full && hubGlass"
      :key="`flare${flare}`"
      :cx="C"
      :cy="C"
      :r="BAND_OUT"
      :stroke="hubGlass"
      :style="{ color: hubGlass }"
      class="shockwave"
    />

    <!-- …and the glass blooms, brightest where the pour landed -->
    <g v-if="flare && full" :key="`bloom${flare}`" class="bloom">
      <path v-for="p in panes" :key="`fl${p.key}`" :d="p.d" :class="p.latest ? 'bloom--hard' : 'bloom--soft'" />
    </g>

    <!-- The hub: a quatrefoil lit by whatever you're drinking now -->
    <g class="hub-group">
      <circle :cx="C" :cy="C" :r="HUB" class="hub" />
      <circle
        v-for="(f, i) in foils"
        :key="`f${i}`"
        :cx="f.x"
        :cy="f.y"
        :r="HUB * 0.36"
        :fill="hubGlass || '#1a1522'"
        :fill-opacity="hubGlass ? 0.92 : 1"
        class="foil"
      />
      <circle :cx="C" :cy="C" :r="HUB * 0.2" class="boss" />
    </g>
  </svg>
</template>

<style scoped>
.rose {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.bleed {
  opacity: 0.6;
  mix-blend-mode: screen;
}
.unlit {
  stroke: var(--lead);
  stroke-width: 2;
  stroke-linejoin: round;
}
.lead-ring,
.lead {
  fill: none;
  stroke: var(--lead);
  stroke-width: 2.2;
}
.mullion__lead {
  stroke: var(--lead);
  stroke-width: 7;
  stroke-linecap: round;
}
.mullion {
  stroke: var(--stone);
  stroke-width: 4;
  stroke-linecap: round;
}
.spandrel {
  fill: var(--stone);
  stroke: var(--lead);
  stroke-width: 2.4;
  stroke-linejoin: round;
}
.pane {
  stroke: var(--lead);
  stroke-width: 2;
  stroke-linejoin: round;
}
.pane-sheen {
  mix-blend-mode: screen;
}
.rose--mini .pane-sheen {
  opacity: 0.7;
}
.rose--mini .unlit {
  stroke-width: 3;
}
.halo__band {
  fill: none;
  stroke: var(--gold);
  stroke-opacity: 0.07;
}
.halo__lead {
  fill: none;
  stroke: var(--lead);
  stroke-width: 5;
}
.halo__gilt {
  fill: none;
  stroke: var(--gold);
  stroke-width: 1.3;
  filter: drop-shadow(0 0 2px rgba(231, 184, 76, 0.6));
}
.rose--mini .halo__gilt {
  stroke-width: 3;
  filter: none;
}
.forecast {
  fill: none;
  stroke: var(--bone);
  stroke-opacity: 0.55;
  stroke-width: 1.6;
  stroke-dasharray: 2 6;
  stroke-linecap: round;
}
.rim {
  fill: none;
  stroke: var(--stone);
}
.rim__edge {
  fill: none;
  stroke: var(--lead);
  stroke-width: 3;
}
.numerals text {
  fill: rgba(245, 241, 232, 0.4);
  font-family: var(--font-display);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-anchor: middle;
  dominant-baseline: central;
}
.jewel {
  stroke: var(--lead);
  stroke-width: 1.6;
  filter: drop-shadow(0 0 5px currentColor);
  transform-box: fill-box;
  transform-origin: center;
}
.hand {
  stroke: var(--bone);
  stroke-opacity: 0.85;
  stroke-width: 1.6;
  stroke-linecap: round;
}
.here {
  stroke: var(--bone);
  stroke-width: 2;
  animation: here-pulse 2.4s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
.rose--mini .here {
  animation: none;
}
.hub {
  fill: var(--stone);
  stroke: var(--lead);
  stroke-width: 3;
}
.foil {
  stroke: var(--lead);
  stroke-width: 2.4;
  transition: fill 500ms ease;
}
.boss {
  fill: var(--bone);
  fill-opacity: 0.85;
  stroke: var(--lead);
  stroke-width: 2;
}
.bloom path {
  fill: #fff8e6;
  opacity: 0;
  mix-blend-mode: screen;
  pointer-events: none;
}
.bloom--soft { animation: bloom-soft 1000ms var(--ease-out); }
.bloom--hard { animation: bloom-hard 1300ms var(--ease-out); }
.shockwave {
  fill: none;
  stroke-width: 6;
  filter: drop-shadow(0 0 6px currentColor);
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  animation: shockwave 900ms var(--ease-out);
  pointer-events: none;
}

/* A pane lit after the window appeared flares, then settles */
.pane.is-new {
  animation: pane-in 500ms var(--ease-out) both;
}
.pane-sheen.is-new {
  animation: sheen-flare 1100ms var(--ease-out) both;
}
.jewel.is-new {
  animation: jewel-set 520ms var(--ease-spring) both;
}

/* The entrance: lead draws in, glass fades up, then the night lights in order */
.is-intro .lead-ring,
.is-intro .lead,
.is-intro .mullion,
.is-intro .mullion__lead {
  stroke-dasharray: 1;
  animation: draw 620ms var(--ease-out) both;
}
.is-intro .lead-ring { animation-delay: 60ms; }
.is-intro .spandrel,
.is-intro .numerals,
.is-intro .unlit {
  animation: fade-in 420ms ease-out both;
  animation-delay: var(--d, 180ms);
}
.is-intro .dusk,
.is-intro .halo__band { animation: fade-in 600ms ease-out 200ms both; }
.is-intro .pane {
  animation: pane-in 420ms var(--ease-out) both;
  animation-delay: var(--d);
}
.is-intro .pane-sheen {
  animation: sheen-flare 900ms var(--ease-out) both;
  animation-delay: var(--d);
}
.is-intro .bleed { animation: bleed-in 1400ms ease-out 400ms both; }
.is-intro .jewel {
  animation: jewel-set 480ms var(--ease-spring) both;
  animation-delay: var(--d);
}
.is-intro .halo { animation: fade-in 500ms ease-out 900ms both; }
.is-intro .now,
.is-intro .forecast { animation: fade-in 400ms ease-out 1000ms both; }
.is-intro .foil { animation: fade-in 500ms ease-out 1050ms both; }

@keyframes draw {
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
}
@keyframes fade-in {
  from { opacity: 0; }
}
@keyframes bleed-in {
  from { opacity: 0; }
  to { opacity: 0.6; }
}
@keyframes pane-in {
  from { opacity: 0; }
}
@keyframes sheen-flare {
  0% { opacity: 0; }
  30% { opacity: 1; filter: brightness(2.4); }
  100% { opacity: 1; }
}
@keyframes jewel-set {
  from { opacity: 0; transform: scale(2.2); }
}
@keyframes shockwave {
  0% { opacity: 1; transform: scale(0.24); stroke-width: 14; }
  100% { opacity: 0; transform: scale(1.1); stroke-width: 1; }
}
@keyframes bloom-soft {
  0% { opacity: 0; }
  25% { opacity: 0.35; }
  100% { opacity: 0; }
}
@keyframes bloom-hard {
  0% { opacity: 0; }
  18% { opacity: 0.95; }
  100% { opacity: 0; }
}
@keyframes here-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.35); }
}
@media (prefers-reduced-motion: reduce) {
  .here { animation: none; }
  .shockwave,
  .bloom { display: none; }
}
</style>
