<script setup>
import { computed } from "vue";
import { BAC_CONSTANTS } from "../constants";
import { useAlcoholStore } from "../stores/alcohol";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime } from "../utils/bac";

const store = useAlcoholStore();
const now = useLiveNow();

const CHART_EVENT_LEAD_MS = 1000 * 30;

const chart = computed(() => {
  const width = 320;
  const height = 180;
  const padding = { top: 16, right: 14, bottom: 24, left: 34 };
  const histories = store.people.map((person) => ({
    person,
    drinks: store.liveDrinkTracking[person.id]?.drinkHistory || [],
  }));
  const timestamps = histories.flatMap(({ drinks }) =>
    drinks.map((drink) => new Date(drink.timestamp).getTime())
  );
  const hasDrinks = timestamps.length > 0;
  const defaultWindow = 1000 * 60 * 60 * 4;
  const startTime = hasDrinks
    ? Math.min(Math.min(...timestamps), now.value - defaultWindow)
    : now.value - defaultWindow;

  const timelineTimes = hasDrinks
    ? Array.from(
        new Set(
          [
            startTime,
            now.value,
            ...timestamps.flatMap((timestamp) => [
              Math.max(startTime, timestamp - CHART_EVENT_LEAD_MS),
              timestamp,
            ]),
          ].map((timestamp) => Math.round(timestamp))
        )
      ).sort((a, b) => a - b)
    : [startTime, now.value];

  const series = histories.map(({ person, drinks }) => {
    const values = timelineTimes.map((time) =>
      calculateBACAtTime(drinks, person, time)
    );

    return {
      id: person.id,
      person,
      name: person.name,
      color: person.color,
      currentBAC: values[values.length - 1] || 0,
      values,
      drinks,
    };
  });

  const maxBAC = Math.max(
    BAC_CONSTANTS.SAFE_LIMIT,
    0.12,
    ...series.flatMap((entry) => entry.values)
  );
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const baselineY = height - padding.bottom;
  const timeSpan = Math.max(1, now.value - startTime);
  const toX = (timestamp) =>
    padding.left + innerWidth * ((timestamp - startTime) / timeSpan);
  const toY = (value) => baselineY - (value / maxBAC) * innerHeight;

  const linePath = (points) =>
    points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = (points) =>
    `${linePath(points)} L ${points[points.length - 1].x} ${baselineY} L ${
      points[0].x
    } ${baselineY} Z`;

  const renderedSeries = series.map((entry) => {
    const points = entry.values.map((value, index) => ({
      x: toX(timelineTimes[index]),
      y: toY(value),
      time: timelineTimes[index],
    }));
    const drinkEvents = entry.drinks.map((drink, index) => {
      const time = new Date(drink.timestamp).getTime();
      const value = calculateBACAtTime(entry.drinks, entry.person, time);

      return {
        id: `${entry.id}-${index}-${drink.type}`,
        x: toX(time),
        y: toY(value),
        icon: drink.icon || null,
        glyph: drink.glyph || drink.type?.charAt(0)?.toUpperCase() || "•",
        label: drink.type,
      };
    });

    return {
      ...entry,
      linePath: linePath(points),
      areaPath: areaPath(points),
      currentPoint: points[points.length - 1],
      drinkEvents,
    };
  });

  const gridLineValues = [0, 0.04, 0.08, 0.12, 0.16].filter(
    (value) => value <= maxBAC
  );
  const windowHours = Math.max(1, Math.round((now.value - startTime) / (1000 * 60 * 60)));

  return {
    width,
    height,
    padding,
    baselineY,
    safeLineY: toY(BAC_CONSTANTS.SAFE_LIMIT),
    renderedSeries,
    gridLines: gridLineValues.map((value) => ({
      value,
      y: toY(value),
      label: `${value.toFixed(2)}%`,
    })),
    maxBAC,
    hasDrinks,
    windowHours,
  };
});
</script>

<template>
  <section class="tracker-panel tracker-panel--soft session-chart enter-rise">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="surface-label">Session chart</p>
        <p class="text-sm font-medium text-[color:var(--ink)]">
          Estimated BAC over time
        </p>
      </div>
      <span class="stat-pill">Last {{ chart.windowHours }}h</span>
    </div>
    <p class="mt-2 text-[11px] leading-4 text-[color:var(--muted)]">
      Each line is one person. Left is earlier, right is now, and higher means
      a higher estimated BAC. The small markers show when each drink was logged.
    </p>

    <div class="session-chart__frame">
      <svg
        class="h-full w-full"
        :viewBox="`0 0 ${chart.width} ${chart.height}`"
        fill="none"
        role="img"
        aria-label="BAC chart for all people"
      >
        <defs>
          <linearGradient
            v-for="series in chart.renderedSeries"
            :id="`chart-fill-${series.id}`"
            :key="`fill-${series.id}`"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" :stop-color="series.color" stop-opacity="0.32" />
            <stop offset="100%" :stop-color="series.color" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <line
          v-for="line in chart.gridLines"
          :key="`grid-${line.value}`"
          :x1="chart.padding.left"
          :y1="line.y"
          :x2="chart.width"
          :y2="line.y"
          class="session-chart__grid"
        />

        <line
          :x1="chart.padding.left"
          :y1="chart.safeLineY"
          :x2="chart.width"
          :y2="chart.safeLineY"
          class="session-chart__safe"
        />

        <text
          v-for="line in chart.gridLines"
          :key="`label-${line.value}`"
          x="8"
          :y="line.y + 4"
          class="session-chart__tick-label"
        >
          {{ line.label }}
        </text>

        <path
          v-for="series in chart.renderedSeries"
          :key="`area-${series.id}`"
          :d="series.areaPath"
          :fill="`url(#chart-fill-${series.id})`"
        />

        <path
          v-for="series in chart.renderedSeries"
          :key="`line-${series.id}`"
          :d="series.linePath"
          :stroke="series.color"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <g
          v-for="series in chart.renderedSeries"
          :key="`events-${series.id}`"
        >
          <g
            v-for="event in series.drinkEvents"
            :key="event.id"
            class="session-chart__event"
          >
            <circle
              :cx="event.x"
              :cy="event.y"
              r="9"
              fill="rgba(255,255,255,0.92)"
              :stroke="series.color"
              stroke-width="2"
            />
            <image
              v-if="event.icon"
              :href="event.icon"
              :x="event.x - 5"
              :y="event.y - 5"
              width="10"
              height="10"
              preserveAspectRatio="xMidYMid meet"
            />
            <text
              v-else
              :x="event.x"
              :y="event.y + 2.5"
              text-anchor="middle"
              class="session-chart__event-glyph"
            >
              {{ event.glyph }}
            </text>
          </g>
        </g>

        <circle
          v-for="series in chart.renderedSeries"
          :key="`point-${series.id}`"
          :cx="series.currentPoint.x"
          :cy="series.currentPoint.y"
          r="4"
          :fill="series.color"
          class="session-chart__current-point"
          stroke="rgba(255,255,255,0.95)"
          stroke-width="2"
        />
      </svg>

      <div v-if="!chart.hasDrinks" class="session-chart__empty">
        Lines wake up when drinks are logged.
      </div>

      <div v-if="chart.hasDrinks" class="session-chart__axis-label session-chart__axis-label--left">
        Earlier
      </div>
      <div v-if="chart.hasDrinks" class="session-chart__axis-label session-chart__axis-label--right">
        Now
      </div>
      <div
        v-if="chart.hasDrinks"
        class="session-chart__safe-label"
        :style="{ top: `${Math.max(8, chart.safeLineY - 10)}px` }"
      >
        Drive limit
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <div
        v-for="series in chart.renderedSeries"
        :key="`legend-${series.id}`"
        class="session-chart__legend"
      >
        <span
          class="session-chart__swatch"
          :style="{ backgroundColor: series.color }"
        ></span>
        <span class="truncate">{{ series.name }}</span>
        <span class="font-semibold text-[color:var(--ink)]">
          {{ series.currentBAC.toFixed(3) }}%
        </span>
      </div>
    </div>
  </section>
</template>
