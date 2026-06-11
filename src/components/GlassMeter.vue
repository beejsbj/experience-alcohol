<script setup>
import { computed } from "vue";

const props = defineProps({
  bac: { type: Number, required: true },
  target: { type: Object, default: null },
  rising: { type: Boolean, default: false },
});

const uid = Math.random().toString(36).slice(2, 8);

const scaleMax = computed(() =>
  Math.max(0.12, props.bac * 1.25, (props.target?.maxBAC ?? 0) * 1.5)
);
const fillTop = computed(
  () => 100 - (Math.min(props.bac, scaleMax.value) / scaleMax.value) * 86
);
const targetY = computed(() =>
  props.target
    ? 100 - ((props.target.minBAC + props.target.maxBAC) / 2 / scaleMax.value) * 86
    : null
);
</script>

<template>
  <div>
    <svg
      viewBox="0 0 68 118"
      class="w-full"
      role="img"
      :aria-label="`Glass meter: estimated ${(bac * 100).toFixed(1)} percent of scale`"
    >
      <defs>
        <clipPath :id="`glass-${uid}`">
          <path
            d="M13 9 C 11.5 38 13 70 14.5 98 Q 15 106 24 106.5 L 44 106 Q 52.5 105.5 53 97 C 54.5 68 56 36 54 9.5 Z"
          />
        </clipPath>
      </defs>
      <g :clip-path="`url(#glass-${uid})`">
        <rect x="8" :y="fillTop" width="52" height="110" fill="var(--amber)" />
        <g v-if="rising" fill="var(--card)" opacity="0.8">
          <circle class="bubble" cx="24" cy="100" r="3" />
          <circle class="bubble bubble-2" cx="36" cy="104" r="2.2" />
          <circle class="bubble bubble-3" cx="45" cy="98" r="2.6" />
        </g>
      </g>
      <path
        d="M13 9 C 11.5 38 13 70 14.5 98 Q 15 106 24 106.5 L 44 106 Q 52.5 105.5 53 97 C 54.5 68 56 36 54 9.5"
        fill="none"
        stroke="var(--ink)"
        stroke-width="2.6"
        stroke-linecap="round"
      />
      <line x1="10" y1="8" x2="58" y2="9.5" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round" />
      <line
        v-if="targetY !== null"
        x1="6"
        :y1="targetY"
        x2="62"
        :y2="targetY + 1.5"
        stroke="var(--redpen)"
        stroke-width="1.8"
        stroke-dasharray="3 4"
        stroke-linecap="round"
      />
    </svg>
    <p
      v-if="target"
      class="scribble text-center text-[13px] leading-none tilt-3"
      style="color: var(--redpen)"
    >
      hold here!
    </p>
  </div>
</template>
