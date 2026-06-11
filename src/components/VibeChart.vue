<script setup>
import { computed } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime, projectBAC } from "../utils/bac";
import { targetDetails } from "../utils/feelings";

const store = useSessionStore();
const now = useLiveNow();

const WIDTH = 320;
const HEIGHT = 150;
const PAD = { top: 14, right: 12, bottom: 18, left: 30 };

const chart = computed(() => {
  const start = new Date(store.session.startedAt).getTime();
  const horizon = now.value + 2 * 60 * 60 * 1000;
  const people = store.activePeople;

  const series = people.map((person, index) => {
    const events = store.eventsFor(person.id);
    const past = [];
    const step = Math.max(60000, Math.floor((now.value - start) / 40) || 60000);
    for (let t = start; t < now.value; t += step) {
      past.push({ time: t, bac: calculateBACAtTime(events, person, t) });
    }
    past.push({ time: now.value, bac: calculateBACAtTime(events, person, now.value) });
    const future = projectBAC(events, person, { from: now.value, hours: 2, stepMinutes: 8 });
    return { person, index, past, future };
  });

  const maxBAC =
    Math.max(0.1, ...series.flatMap((s) => [...s.past, ...s.future].map((p) => p.bac))) * 1.15;
  const toX = (t) => PAD.left + ((t - start) / (horizon - start)) * (WIDTH - PAD.left - PAD.right);
  const toY = (bac) => HEIGHT - PAD.bottom - (bac / maxBAC) * (HEIGHT - PAD.top - PAD.bottom);
  const wobblePath = (points, seed) =>
    points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${toX(p.time).toFixed(1)} ${(toY(p.bac) + Math.sin(i * 2.1 + seed) * 1.1).toFixed(1)}`
      )
      .join(" ");

  const rendered = series.map((s) => ({
    id: s.person.id,
    color: s.person.color,
    pastPath: wobblePath(s.past, s.index * 7),
    futurePath: wobblePath([s.past.at(-1), ...s.future], s.index * 7 + 3),
    nowPoint: { x: toX(now.value), y: toY(s.past.at(-1).bac) },
    focused: s.person.id === store.focusedPersonId,
  }));

  const focusedPerson = people.find((p) => p.id === store.focusedPersonId);
  const target = focusedPerson ? targetDetails(focusedPerson.pinnedState) : null;

  return {
    rendered,
    targetY: target ? toY((target.minBAC + target.maxBAC) / 2) : null,
    ticks: [0.04, 0.08, 0.12].filter((v) => v < maxBAC).map((v) => ({ v, y: toY(v) })),
    focusedPoint: rendered.find((r) => r.focused)?.nowPoint ?? null,
  };
});
</script>

<template>
  <section>
    <p class="eyebrow print">the vibe line</p>
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="mt-1 w-full"
      role="img"
      aria-label="Estimated BAC over the night, with a dashed forecast of the next two hours"
    >
      <g v-for="tick in chart.ticks" :key="tick.v">
        <line
          :x1="PAD.left"
          :y1="tick.y"
          :x2="WIDTH - PAD.right"
          :y2="tick.y"
          stroke="var(--line)"
          stroke-width="1"
          stroke-dasharray="2 6"
        />
        <text :x="2" :y="tick.y + 3" class="chart-tick">{{ tick.v.toFixed(2) }}</text>
      </g>
      <line
        v-if="chart.targetY !== null"
        :x1="PAD.left"
        :y1="chart.targetY"
        :x2="WIDTH - PAD.right"
        :y2="chart.targetY + 2"
        stroke="var(--redpen)"
        stroke-width="1.4"
        stroke-dasharray="3 5"
      />
      <g v-for="series in chart.rendered" :key="series.id" :opacity="series.focused ? 1 : 0.4">
        <path
          :d="series.pastPath"
          fill="none"
          :stroke="series.color"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          :d="series.futurePath"
          fill="none"
          :stroke="series.color"
          stroke-width="1.8"
          stroke-dasharray="4 5"
          stroke-linecap="round"
        />
        <circle :cx="series.nowPoint.x" :cy="series.nowPoint.y" r="3.4" :fill="series.color" />
      </g>
      <text
        v-if="chart.focusedPoint"
        :x="Math.min(chart.focusedPoint.x + 6, 235)"
        :y="Math.max(chart.focusedPoint.y - 8, 12)"
        class="chart-note"
      >
        you are here
      </text>
    </svg>
  </section>
</template>
