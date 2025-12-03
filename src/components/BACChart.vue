<script setup>
import { computed } from "vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from "echarts/components";
import VChart from "vue-echarts";
import { FEELING_STATES } from "../constants/index";
import { useAlcoholStore } from "../stores/alcohol";

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
]);

const store = useAlcoholStore();

const chartOption = computed(() => {
  const series = [];
  const colors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#0088fe",
    "#00C49F",
  ];

  // Generate time points (every 15 minutes)
  const timePoints = [];
  for (let hour = 0; hour <= store.timeRange; hour += 0.25) {
    timePoints.push(hour);
  }

  // Add BAC lines for each person
  store.people.forEach((person, index) => {
    const data = timePoints.map((hour) => ({
      value: [hour, store.calculateBACOverTime(person, hour)],
    }));

    series.push({
      name: `Person ${person.id} (${person.weight}kg, ${person.gender})`,
      type: "line",
      data: data,
      smooth: true,
      itemStyle: { color: colors[index % colors.length] },
    });
  });

  // Add feeling state threshold lines
  FEELING_STATES.forEach((state) => {
    series.push({
      name: `${state.state} threshold`,
      type: "line",
      data: timePoints.map((hour) => ({
        value: [hour, state.minBAC],
      })),
      lineStyle: { type: "dashed", color: "rgba(0, 0, 0, 0.2)" },
      symbol: "none",
    });
  });

  return {
    grid: { left: "5%", right: "5%", top: "10%", bottom: "10%" },
    xAxis: {
      type: "value",
      name: "Hours",
      nameLocation: "middle",
      nameGap: 30,
      min: 0,
      max: store.timeRange,
    },
    yAxis: {
      type: "value",
      name: "BAC %",
      nameLocation: "middle",
      nameGap: 40,
      min: 0,
      max: 0.25,
    },
    tooltip: {
      trigger: "axis",
      formatter: function (params) {
        const hour = params[0].value[0];
        let result = `Hour ${hour.toFixed(2)}<br/>`;
        params.forEach((param) => {
          if (!param.seriesName.includes("threshold")) {
            result += `${param.seriesName}: ${param.value[1].toFixed(3)}%<br/>`;
          }
        });
        return result;
      },
    },
    legend: {
      data: series.map((s) => s.name),
      type: "scroll",
      bottom: 0,
    },
    series,
  };
});
</script>

<template>
  <div class="mb-6">
    <h2 class="text-xl font-semibold mb-2">BAC Over Time</h2>
    <div class="bg-white p-4 rounded shadow" style="height: 400px">
      <v-chart class="w-full h-full" :option="chartOption" autoresize />
    </div>
  </div>
</template>
