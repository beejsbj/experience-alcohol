<script setup>
import { computed } from "vue";
import { angleAt, bandPath, linePath, polar } from "../utils/dial";
import { LEAD_RINGS, SCALE_MAX, feelingScale, paneBands, traceryCells, windowModel } from "../utils/window";
import { targetDetails } from "../utils/feelings";
import { scatterRand } from "../utils/scatter";

// One person's night as a backlit rose window. Pure drawing: everything comes
// from their pours, the time, and the vibe they pinned.
const props = defineProps({
  person: { type: Object, required: true },
  events: { type: Array, required: true },
  now: { type: Number, required: true },
  detail: { type: String, default: "full" }, // 'full' | 'mini'
});

const C = 200;
const RIM_OUT = 196;
const RIM_IN = 164;
const BAND_OUT = 158;
const HUB = 38;
const scale = feelingScale({ inner: HUB, outer: BAND_OUT });
const geo = { cx: C, cy: C };
const full = computed(() => props.detail === "full");
// Filter ids must be unique per window: the table shows many at once.
const uid = `w${Math.random().toString(36).slice(2, 8)}`;

const model = computed(() => windowModel(props.events, props.person, { now: props.now }));

const panes = computed(() =>
  model.value.wedges.flatMap((w) =>
    paneBands(w.bac).map(([b0, b1], i) => ({
      key: `${w.id}:${i}`,
      d: bandPath(w.t0, w.t1, scale(b0), scale(b1), geo),
      fill: w.glass,
      opacity: w.shades[i],
    }))
  )
);

// The unlit window: every cell of the tracery as dark coloured glass.
const HALF_HOUR = 1800000;
const dayZero = new Date(2000, 0, 1, 0, 0).getTime();
const unlit = traceryCells().map((c) => ({
  key: c.key,
  d: bandPath(dayZero + c.slot * HALF_HOUR, dayZero + (c.slot + 1) * HALF_HOUR, scale(c.from), scale(c.to), geo),
  fill: c.glass,
  opacity: c.shade,
}));

const spokes = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2;
  const p0 = polar(C, C, HUB, a);
  const p1 = polar(C, C, BAND_OUT, a);
  return { key: i, x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, hour: i % 2 === 0 };
});

const leadRings = LEAD_RINGS.map((r) => scale(r));

const NUMERALS = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
const numerals = NUMERALS.map((label, h) => {
  const a = (h / 12) * Math.PI * 2;
  const p = polar(C, C, (RIM_IN + RIM_OUT) / 2, a);
  return { label, x: p.x, y: p.y, rotate: (a * 180) / Math.PI };
});

// Every pour is a jewel set into the rim at the moment it was poured.
const jewels = computed(() =>
  model.value.pours.map((p) => {
    const rand = scatterRand(`jewel:${p.id}`);
    const r = (RIM_IN + RIM_OUT) / 2 + (rand() - 0.5) * 12;
    const at = polar(C, C, r, angleAt(p.time));
    return { key: p.id, x: at.x, y: at.y, fill: p.glass, r: 4.2 + rand() * 1.8 };
  })
);

const target = computed(() => targetDetails(props.person.pinnedState));
const halo = computed(() => {
  if (!target.value) return null;
  const r0 = scale(target.value.minBAC);
  const r1 = scale(Math.min(target.value.maxBAC + 0.009, SCALE_MAX));
  return { r0, r1, mid: (r0 + r1) / 2, width: r1 - r0 };
});

const forecast = computed(() => (full.value ? linePath(model.value.forecast, { ...geo, scale }) : ""));

const hand = computed(() => {
  const a = angleAt(props.now);
  const tip = polar(C, C, RIM_IN - 2, a);
  const base = polar(C, C, HUB, a);
  const here = polar(C, C, scale(model.value.bac), a);
  return { tip, base, here };
});

const hubGlass = computed(() => (model.value.bac > 0 ? model.value.glass : null));
const foils = [0, 1, 2, 3].map((i) => polar(C, C, HUB * 0.42, (i / 4) * Math.PI * 2 + Math.PI / 4));
</script>

<template>
  <svg viewBox="0 0 400 400" class="rose" :class="`rose--${detail}`" role="img" :aria-label="`${person.name || 'someone'}'s night as a rose window`">
    <defs>
      <filter :id="`${uid}-mottle`" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" :seed="7" result="noise" />
        <feColorMatrix in="noise" type="matrix"
          values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0.9 0.9 0.9 0 -0.9" result="spots" />
        <feComposite in="spots" in2="SourceGraphic" operator="in" result="spotsIn" />
        <feBlend in="SourceGraphic" in2="spotsIn" mode="soft-light" />
      </filter>
      <filter :id="`${uid}-bleed`" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
      <radialGradient :id="`${uid}-dark`" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="#1d1826" />
        <stop offset="100%" stop-color="#0c0a11" />
      </radialGradient>
    </defs>

    <!-- The stone and the unlit glass -->
    <circle :cx="C" :cy="C" :r="RIM_OUT" :fill="`url(#${uid}-dark)`" />

    <!-- Light bleeding through the lit panes -->
    <g v-if="full && panes.length" :filter="`url(#${uid}-bleed)`" class="bleed">
      <path v-for="p in panes" :key="`b${p.key}`" :d="p.d" :fill="p.fill" />
    </g>

    <!-- Unlit glass: the window is always made, the night only lights it -->
    <g>
      <path v-for="c in unlit" :key="`u${c.key}`" :d="c.d" :fill="c.fill" :fill-opacity="c.opacity" class="unlit" />
    </g>

    <!-- Tracery lines -->
    <g class="tracery">
      <circle v-for="(r, i) in leadRings" :key="`ring${i}`" :cx="C" :cy="C" :r="r" />
      <line v-for="s in spokes" :key="`s${s.key}`" :x1="s.x1" :y1="s.y1" :x2="s.x2" :y2="s.y2" :class="{ 'is-minor': !s.hour }" />
    </g>

    <!-- The glass itself -->
    <g :filter="full ? `url(#${uid}-mottle)` : undefined">
      <path
        v-for="p in panes"
        :key="p.key"
        :d="p.d"
        :fill="p.fill"
        :fill-opacity="p.opacity"
        class="pane"
      />
    </g>

    <!-- Pinned vibe: a gold halo where tonight should stay -->
    <g v-if="halo" class="halo">
      <circle :cx="C" :cy="C" :r="halo.mid" :stroke-width="halo.width" class="halo__band" />
      <circle :cx="C" :cy="C" :r="halo.r0" class="halo__edge" />
      <circle :cx="C" :cy="C" :r="halo.r1" class="halo__edge" />
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
    <circle v-for="j in jewels" :key="j.key" :cx="j.x" :cy="j.y" :r="j.r" :fill="j.fill" class="jewel" />

    <!-- Now -->
    <line :x1="hand.base.x" :y1="hand.base.y" :x2="hand.tip.x" :y2="hand.tip.y" class="hand" />
    <circle v-if="model.bac > 0" :cx="hand.here.x" :cy="hand.here.y" r="5.5" :fill="model.glass" class="here" />

    <!-- The hub: a quatrefoil lit by whatever you're drinking now -->
    <circle :cx="C" :cy="C" :r="HUB" class="hub" />
    <circle
      v-for="(f, i) in foils"
      :key="`f${i}`"
      :cx="f.x"
      :cy="f.y"
      :r="HUB * 0.36"
      :fill="hubGlass || '#1a1522'"
      :fill-opacity="hubGlass ? 0.9 : 1"
      class="foil"
    />
    <circle :cx="C" :cy="C" :r="HUB * 0.2" class="boss" />
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
  opacity: 0.55;
  mix-blend-mode: screen;
}
.unlit {
  stroke: var(--lead);
  stroke-width: 2.4;
  stroke-linejoin: round;
}
.tracery circle,
.tracery line {
  fill: none;
  stroke: rgba(245, 241, 232, 0.07);
  stroke-width: 1;
}
.tracery line.is-minor {
  stroke: rgba(245, 241, 232, 0.035);
}
.pane {
  stroke: var(--lead);
  stroke-width: 2.4;
  stroke-linejoin: round;
  transition: fill-opacity 600ms ease;
}
.rose--mini .pane {
  stroke-width: 3;
}
.halo__band {
  fill: none;
  stroke: var(--gold);
  stroke-opacity: 0.16;
}
.halo__edge {
  fill: none;
  stroke: var(--gold);
  stroke-width: 1.4;
  stroke-dasharray: 1 5;
  stroke-linecap: round;
}
.forecast {
  fill: none;
  stroke: var(--bone);
  stroke-opacity: 0.5;
  stroke-width: 1.5;
  stroke-dasharray: 2 6;
  stroke-linecap: round;
}
.rim {
  fill: none;
  stroke: #120f18;
}
.rim__edge {
  fill: none;
  stroke: var(--lead);
  stroke-width: 3;
}
.numerals text {
  fill: rgba(245, 241, 232, 0.34);
  font-family: var(--font-display);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-anchor: middle;
  dominant-baseline: central;
}
.jewel {
  stroke: var(--lead);
  stroke-width: 1.6;
  filter: drop-shadow(0 0 5px currentColor);
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
  fill: #0c0a11;
  stroke: var(--lead);
  stroke-width: 3;
}
.foil {
  stroke: var(--lead);
  stroke-width: 2.4;
}
.boss {
  fill: var(--bone);
  fill-opacity: 0.85;
  stroke: var(--lead);
  stroke-width: 2;
}
@keyframes here-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.35); }
}
@media (prefers-reduced-motion: reduce) {
  .here { animation: none; }
}
</style>
