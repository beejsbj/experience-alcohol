<script setup>
import { computed } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime, projectBAC } from "../utils/bac";
import { targetDetails } from "../utils/feelings";
import { scatterRand } from "../utils/scatter";

// The night as the printer sees it: a dot-dithered trace of the estimate,
// hour ticks, the others at the table as faint dotted lines. On top of the
// print, the pen: a highlighter swipe over the vibe being held, and a loose
// circle round "now".
const props = defineProps({
  person: { type: Object, required: true },
});

const store = useSessionStore();
const now = useLiveNow();

const W = 310;
const H = 150;
const PAD = { top: 16, right: 30, bottom: 20, left: 4 };
const HOUR = 3600000;

const uid = computed(() => String(props.person.id).replace(/[^a-z0-9]/gi, ""));

const chart = computed(() => {
  const start = new Date(store.session.startedAt).getTime();
  const horizon = Math.max(now.value + 2 * HOUR, start + 3 * HOUR);

  const series = store.activePeople.map((person) => {
    const events = store.eventsFor(person.id);
    const step = Math.max(60000, Math.floor((now.value - start) / 60) || 60000);
    const past = [];
    for (let t = start; t < now.value; t += step) {
      past.push({ time: t, bac: calculateBACAtTime(events, person, t) });
    }
    // Sample just after each pour too, so the printed steps land true.
    for (const e of events) {
      const t = new Date(e.timestamp).getTime();
      if (t > start && t < now.value) {
        past.push({ time: t - 1, bac: calculateBACAtTime(events, person, t - 1) });
        past.push({ time: t + 1, bac: calculateBACAtTime(events, person, t + 1) });
      }
    }
    past.sort((a, b) => a.time - b.time);
    past.push({ time: now.value, bac: calculateBACAtTime(events, person, now.value) });
    const future = projectBAC(events, person, { from: now.value, hours: 2, stepMinutes: 6 });
    return { person, past, future };
  });

  const peak = Math.max(0, ...series.flatMap((s) => [...s.past, ...s.future].map((p) => p.bac)));
  const maxBAC = Math.max(0.12, peak * 1.12);

  const x = (t) => PAD.left + ((t - start) / (horizon - start)) * (W - PAD.left - PAD.right);
  const y = (b) => H - PAD.bottom - (b / maxBAC) * (H - PAD.top - PAD.bottom);
  const line = (pts) =>
    pts.map((p, i) => `${i ? "L" : "M"}${x(p.time).toFixed(1)} ${y(p.bac).toFixed(1)}`).join(" ");

  const base = H - PAD.bottom;
  const others = [];
  let mine = null;
  for (const s of series) {
    const nowPt = s.past.at(-1);
    const entry = {
      id: s.person.id,
      past: line(s.past),
      future: line([nowPt, ...s.future]),
      fill: `${line(s.past)} L${x(nowPt.time).toFixed(1)} ${base} L${x(s.past[0].time).toFixed(1)} ${base} Z`,
      now: { x: x(nowPt.time), y: y(nowPt.bac) },
      initial: (s.person.name?.trim()?.[0] || "?").toUpperCase(),
    };
    if (s.person.id === props.person.id) mine = { ...entry, series: s };
    else others.push(entry);
  }

  // Hour ticks along the printed baseline.
  const ticks = [];
  for (let t = Math.ceil(start / HOUR) * HOUR; t <= horizon; t += HOUR) {
    ticks.push({ x: x(t), label: String(new Date(t).getHours()).padStart(2, "0") });
  }

  // Highlighter band over the vibe being held.
  const target = targetDetails(props.person.pinnedState);
  let band = null;
  if (target) {
    const rand = scatterRand(`band:${props.person.id}:${target.state}`);
    const top = y(target.maxBAC);
    const bot = y(target.minBAC);
    const x0 = PAD.left - 2 + rand() * 4;
    const x1 = W - PAD.right + 4 + rand() * 6;
    const tilt = (rand() * 2 - 1) * 1.6;
    // chisel-tip ends: the marker goes on and comes off at an angle
    band = {
      d: `M${x0 + 3} ${top + tilt} L${x1} ${top - tilt} L${x1 - 4} ${bot - tilt} L${x0} ${bot + tilt} Z`,
      labelX: W - PAD.right + 2,
      labelY: (top + bot) / 2 + 4,
      label: "hold",
    };
  }

  // A loose pen loop around "now", seeded so it's drawn the same each time.
  let loop = null;
  let note = null;
  if (mine) {
    const rand = scatterRand(`loop:${props.person.id}`);
    const { x: cx, y: cy } = mine.now;
    const rx = 9 + rand() * 3;
    const ry = 7 + rand() * 2;
    const pts = [];
    for (let i = 0; i <= 30; i += 1) {
      const a = -0.6 + (i / 30) * Math.PI * 2.25;
      const wob = 1 + (rand() * 2 - 1) * 0.08;
      pts.push(`${(cx + Math.cos(a) * rx * wob).toFixed(1)} ${(cy + Math.sin(a) * ry * wob).toFixed(1)}`);
    }
    loop = `M${pts.join(" L")}`;

    // Absorption is instant in this model, so "climbing" never happens;
    // speak to how fresh the last pour is instead.
    const events = store.eventsFor(props.person.id);
    const last = events.at(-1);
    const sinceLast = last ? (now.value - new Date(last.timestamp).getTime()) / 60000 : Infinity;
    const level = mine.series.past.at(-1).bac;
    const noteY = cy < PAD.top + 26 ? cy + 26 : cy - 16;
    note = {
      x: Math.min(cx + 12, W - PAD.right - 36),
      y: noteY,
      text: sinceLast < 15 ? "you — fresh one" : level > 0.001 ? "you, easing off" : "you",
    };
  }

  return {
    others,
    mine,
    ticks,
    band,
    loop,
    note,
    base,
    limitY: y(0.08),
    width: W - PAD.right,
  };
});
</script>

<template>
  <svg
    :viewBox="`0 0 ${W} ${H}`"
    class="block w-full overflow-visible"
    role="img"
    aria-label="Estimated BAC across the night, printed, with pen notes"
  >
    <defs>
      <pattern :id="`dither-${uid}`" width="2.6" height="2.6" patternUnits="userSpaceOnUse">
        <rect width="1.1" height="1.1" fill="var(--print)" />
      </pattern>
    </defs>

    <!-- pen: highlighter over the held vibe (under the print, as ink sinks in) -->
    <g v-if="chart.band">
      <path :d="chart.band.d" fill="var(--pen)" opacity="0.2" style="mix-blend-mode: multiply" />
    </g>

    <!-- print: the 0.08 guide and the baseline with hour ticks -->
    <line :x1="0" :x2="chart.width" :y1="chart.limitY" :y2="chart.limitY" stroke="var(--faded)" stroke-width="0.8" stroke-dasharray="1 3" />
    <text x="1" :y="chart.limitY - 3" font-size="7" fill="var(--faded)" class="print">.08</text>
    <line :x1="0" :x2="chart.width" :y1="chart.base" :y2="chart.base" stroke="var(--print)" stroke-width="1" />
    <g v-for="tick in chart.ticks" :key="tick.x">
      <line :x1="tick.x" :x2="tick.x" :y1="chart.base" :y2="chart.base + 3" stroke="var(--print)" stroke-width="1" />
      <text :x="tick.x" :y="chart.base + 12" font-size="7.5" text-anchor="middle" fill="var(--print-soft)" class="print">{{ tick.label }}</text>
    </g>

    <!-- print: everyone else at the table, faint -->
    <g v-for="o in chart.others" :key="o.id" opacity="0.5">
      <path :d="o.past" fill="none" stroke="var(--print)" stroke-width="1" stroke-dasharray="1 2.2" />
      <text :x="o.now.x + 3" :y="o.now.y - 2" font-size="7" fill="var(--print-soft)" class="print">{{ o.initial }}</text>
    </g>

    <!-- print: this person's night, dither-filled -->
    <g v-if="chart.mine">
      <path :d="chart.mine.fill" :fill="`url(#dither-${uid})`" opacity="0.5" />
      <path :d="chart.mine.past" fill="none" stroke="var(--print)" stroke-width="1.7" stroke-linejoin="round" />
      <path :d="chart.mine.future" fill="none" stroke="var(--print)" stroke-width="1.2" stroke-dasharray="3 3" />
      <rect :x="chart.mine.now.x - 2.5" :y="chart.mine.now.y - 2.5" width="5" height="5" fill="var(--print)" />
    </g>

    <!-- pen: loop round now, a word about where it's heading, the held vibe named -->
    <path v-if="chart.loop" :d="chart.loop" fill="none" stroke="var(--pen)" stroke-width="1.4" stroke-linecap="round" />
    <text
      v-if="chart.note"
      :x="chart.note.x"
      :y="chart.note.y"
      class="pen"
      font-size="15"
      fill="var(--pen)"
      :transform="`rotate(-4 ${chart.note.x} ${chart.note.y})`"
    >{{ chart.note.text }}</text>
    <text
      v-if="chart.band"
      :x="chart.band.labelX"
      :y="chart.band.labelY"
      class="pen"
      font-size="14"
      fill="var(--pen)"
    >{{ chart.band.label }}</text>
  </svg>
</template>
