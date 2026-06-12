<script setup>
import { computed } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime, projectBAC } from "../utils/bac";
import { targetDetails } from "../utils/feelings";
import { scatterRand } from "../utils/scatter";

const props = defineProps({
  // focused person object — all active people are loaded from store
  person: { type: Object, required: true },
});

const store = useSessionStore();
const now = useLiveNow();

const WIDTH = 300;
const HEIGHT = 132;
const PAD = { top: 26, right: 12, bottom: 18, left: 10 };

const chart = computed(() => {
  const start = new Date(store.session.startedAt).getTime();
  const horizon = now.value + 2 * 60 * 60 * 1000;
  const people = store.activePeople;

  const series = people.map((person, idx) => {
    const events = store.eventsFor(person.id);
    const step = Math.max(60000, Math.floor((now.value - start) / 40) || 60000);
    const past = [];
    for (let t = start; t < now.value; t += step) {
      past.push({ time: t, bac: calculateBACAtTime(events, person, t) });
    }
    past.push({ time: now.value, bac: calculateBACAtTime(events, person, now.value) });
    const future = projectBAC(events, person, { from: now.value, hours: 2, stepMinutes: 8 });
    return { person, idx, past, future };
  });

  const maxBAC =
    Math.max(0.1, ...series.flatMap((s) => [...s.past, ...s.future].map((p) => p.bac))) * 1.15;

  const toX = (t) =>
    PAD.left + ((t - start) / (horizon - start)) * (WIDTH - PAD.left - PAD.right);
  const toY = (bac) =>
    HEIGHT - PAD.bottom - (bac / maxBAC) * (HEIGHT - PAD.top - PAD.bottom);

  // hand-drawn path: jitter each point y by seeded scatterRand
  const roughPath = (points, seedBase) => {
    const rand = scatterRand(seedBase);
    return points
      .map((p, i) => {
        const jy = (rand() * 2 - 1) * 0.8;
        return `${i === 0 ? "M" : "L"} ${toX(p.time).toFixed(1)} ${(toY(p.bac) + jy).toFixed(1)}`;
      })
      .join(" ");
  };

  const rendered = series.map((s) => {
    const focused = s.person.id === props.person.id;
    return {
      id: s.person.id,
      color: focused ? "var(--ink)" : s.person.color,
      opacity: focused ? 1 : 0.35,
      pastPath: roughPath(s.past, `chart:past:${s.person.id}:${s.past.length}`),
      futurePath: roughPath(
        [s.past.at(-1), ...s.future],
        `chart:future:${s.person.id}:${s.future.length}`
      ),
      nowPoint: { x: toX(now.value), y: toY(s.past.at(-1).bac) },
      focused,
    };
  });

  const target = targetDetails(props.person.pinnedState);

  const focusedNow = rendered.find((r) => r.focused)?.nowPoint ?? null;

  const focusedSeries = series.find((s) => s.person.id === props.person.id) ?? null;
  let trend = null;
  if (focusedSeries && focusedSeries.future.length > 1) {
    const midIdx = Math.floor(focusedSeries.future.length / 2);
    const mid = focusedSeries.future[midIdx];
    trend = {
      label:
        mid.bac > focusedSeries.past.at(-1).bac + 0.0005 ? "climbing" : "drifting down",
      x: Math.min(toX(mid.time), WIDTH - 76),
      y: Math.min(toY(mid.bac) + 18, HEIGHT - 4),
    };
  }

  // floating "you are here" with an arrow curving down to the dot
  let here = null;
  if (focusedNow) {
    const tx = Math.max(36, Math.min(focusedNow.x - 14, WIDTH - 72));
    const ty = Math.max(13, focusedNow.y - 24);
    here = {
      tx,
      ty,
      arrow: `M ${tx + 22} ${ty + 4} Q ${((tx + 22 + focusedNow.x) / 2).toFixed(1)} ${((ty + focusedNow.y) / 2 + 7).toFixed(1)} ${focusedNow.x + 1} ${focusedNow.y - 5.5}`,
    };
  }

  return {
    rendered,
    targetY: target ? toY((target.minBAC + target.maxBAC) / 2) : null,
    focusedNow,
    trend,
    here,
  };
});
</script>

<template>
  <div class="px-1">
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="w-full"
      role="img"
      aria-label="Estimated BAC over the night, hand-drawn"
    >
      <!-- target/pinned vibe line (amber dashed) -->
      <line
        v-if="chart.targetY !== null"
        :x1="PAD.left"
        :y1="chart.targetY"
        :x2="WIDTH - PAD.right"
        :y2="chart.targetY + 1.5"
        stroke="var(--amber)"
        stroke-width="1.3"
        stroke-dasharray="3 5"
      />
      <text
        v-if="chart.targetY !== null"
        :x="PAD.left + 4"
        :y="Math.max(chart.targetY - 5, 10)"
        font-family="'Caveat', cursive"
        font-size="10.5"
        fill="var(--amber)"
        transform-origin="center"
      >the vibe you're holding</text>

      <!-- per-person series -->
      <g
        v-for="s in chart.rendered"
        :key="s.id"
        :opacity="s.opacity"
      >
        <!-- past solid line -->
        <path
          :d="s.pastPath"
          fill="none"
          :stroke="s.color"
          :stroke-width="s.focused ? 2.6 : 2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- future dashed -->
        <path
          :d="s.futurePath"
          fill="none"
          :stroke="s.color"
          :stroke-width="s.focused ? 1.8 : 1.4"
          stroke-dasharray="4 5"
          stroke-linecap="round"
        />
        <!-- now dot -->
        <circle :cx="s.nowPoint.x" :cy="s.nowPoint.y" :r="s.focused ? 4.2 : 3" :fill="s.focused ? 'var(--redpen)' : s.color" />
      </g>

      <!-- "you are here": floating red note + arrow down to the dot -->
      <g v-if="chart.here">
        <text
          :x="chart.here.tx"
          :y="chart.here.ty"
          font-family="'Caveat', cursive"
          font-size="11.5"
          fill="var(--redpen)"
          :transform="`rotate(-3 ${chart.here.tx} ${chart.here.ty})`"
        >you are here</text>
        <path
          :d="chart.here.arrow"
          fill="none"
          stroke="var(--redpen)"
          stroke-width="1.2"
          stroke-linecap="round"
        />
      </g>

      <text
        v-if="chart.trend"
        :x="chart.trend.x"
        :y="chart.trend.y"
        font-family="'Caveat', cursive"
        font-size="10.5"
        fill="var(--faded)"
        :transform="`rotate(4 ${chart.trend.x} ${chart.trend.y})`"
      >{{ chart.trend.label }}</text>
    </svg>
  </div>
</template>
