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
const HEIGHT = 120;
const PAD = { top: 12, right: 10, bottom: 20, left: 28 };

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
        const jy = (rand() * 2 - 1) * 1.5;
        return `${i === 0 ? "M" : "L"} ${toX(p.time).toFixed(1)} ${(toY(p.bac) + jy).toFixed(1)}`;
      })
      .join(" ");
  };

  const rendered = series.map((s) => {
    const focused = s.person.id === props.person.id;
    return {
      id: s.person.id,
      color: focused ? "var(--pen)" : s.person.color,
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
  const ticks = [0.04, 0.08, 0.12].filter((v) => v < maxBAC).map((v) => ({ v, y: toY(v) }));

  const focusedNow = rendered.find((r) => r.focused)?.nowPoint ?? null;

  return {
    rendered,
    targetY: target ? toY((target.minBAC + target.maxBAC) / 2) : null,
    ticks,
    focusedNow,
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
      <!-- grid tick lines + axis labels in Caveat -->
      <g v-for="tick in chart.ticks" :key="tick.v">
        <line
          :x1="PAD.left"
          :y1="tick.y"
          :x2="WIDTH - PAD.right"
          :y2="tick.y"
          stroke="var(--faded)"
          stroke-width="0.7"
          stroke-dasharray="2 6"
        />
        <text
          :x="2"
          :y="tick.y + 3.5"
          font-family="'Caveat', cursive"
          font-size="8"
          fill="var(--faded)"
        >{{ tick.v.toFixed(2) }}</text>
      </g>

      <!-- target/pinned vibe line (red dashed) -->
      <line
        v-if="chart.targetY !== null"
        :x1="PAD.left"
        :y1="chart.targetY"
        :x2="WIDTH - PAD.right"
        :y2="chart.targetY + 1.5"
        stroke="var(--redpen)"
        stroke-width="1.2"
        stroke-dasharray="3 5"
      />

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
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- future dashed -->
        <path
          :d="s.futurePath"
          fill="none"
          :stroke="s.color"
          stroke-width="1.6"
          stroke-dasharray="4 5"
          stroke-linecap="round"
        />
        <!-- now dot -->
        <circle :cx="s.nowPoint.x" :cy="s.nowPoint.y" r="3" :fill="s.color" />
      </g>

      <!-- "you are here" red Caveat label -->
      <text
        v-if="chart.focusedNow"
        :x="Math.min(chart.focusedNow.x + 5, WIDTH - 55)"
        :y="Math.max(chart.focusedNow.y - 7, 10)"
        font-family="'Caveat', cursive"
        font-size="9.5"
        fill="var(--redpen)"
      >you are here</text>
    </svg>
  </div>
</template>
