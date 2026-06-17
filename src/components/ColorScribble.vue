<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { PERSON_COLORS } from "../constants";
import { scatter } from "../utils/scatter";

const props = defineProps({ person: { type: Object, required: true } });
const store = useSessionStore();
const expanded = ref(false);
const rootRef = ref(null);

const handleDocClick = (e) => {
  if (!rootRef.value?.contains(e.target)) expanded.value = false;
};
onMounted(() => document.addEventListener("click", handleDocClick));
onBeforeUnmount(() => document.removeEventListener("click", handleDocClick));

const setColor = (color) => {
  store.updatePerson(props.person.id, { color });
  expanded.value = false;
};
</script>

<template>
  <div
    ref="rootRef"
    class="absolute z-10 flex flex-col items-end gap-1"
    style="top: 2px; right: 2px"
    :style="{ ...scatter(`swatch:${person.id}`, { r: 8, x: 2, y: 2 }), top: '2px', right: '2px' }"
  >
    <button type="button" aria-label="Pick ink color" @click.stop="expanded = !expanded">
      <svg width="34" height="26" viewBox="0 0 34 26" aria-hidden="true">
        <path
          d="M3 21 Q8 4 11 14 Q13 22 16 8 Q18 1 21 13 Q23 20 26 9 Q28 3 31 15"
          fill="none"
          :stroke="person.color"
          stroke-width="4.5"
          stroke-linecap="round"
          opacity="0.85"
        />
      </svg>
    </button>
    <div v-if="expanded" class="flex flex-col gap-0.5">
      <button
        v-for="color in PERSON_COLORS"
        :key="color"
        type="button"
        :aria-label="`Set ink color ${color}`"
        @click.stop="setColor(color)"
      >
        <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden="true">
          <path
            d="M2 14 Q6 3 9 10 Q11 16 14 6 Q16 1 19 9 Q21 14 24 7"
            fill="none"
            :stroke="color"
            :stroke-width="color === person.color ? 5 : 3.5"
            stroke-linecap="round"
            opacity="0.9"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
