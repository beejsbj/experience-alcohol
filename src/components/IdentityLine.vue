<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useSessionStore } from "../stores/session";
import { scatter } from "../utils/scatter";
import WriteOn from "./WriteOn.vue";
import TallyStrokes from "./TallyStrokes.vue";
import SexGlyph from "./SexGlyph.vue";
import ScrubNumber from "./ScrubNumber.vue";
import WeightRuler from "./WeightRuler.vue";

// Who this tab is for. The printer knows the seat; everything personal is
// written in by hand over it — the name, the body, the weight — plus a tally.
const props = defineProps({
  person: { type: Object, required: true },
  seat: { type: Number, default: 1 },
  pours: { type: Number, default: 0 },
});

const store = useSessionStore();

// Drag the written weight sideways to change it; tap it for the printed ruler.
const rulerOpen = ref(false);
const slip = ref(null);
const weightEl = ref(null);
const identity = ref(null);
const slipStyle = ref({});

const positionSlip = () => {
  if (!identity.value || !weightEl.value) return;
  const host = identity.value.getBoundingClientRect();
  const weight = weightEl.value.getBoundingClientRect();
  // Use the actual paper bounds, including its seeded rotation. Leave room
  // for the slip's own slight tilt rather than letting its corners escape.
  const paper = identity.value.closest(".paper__sheet").getBoundingClientRect();
  const width = Math.min(260, paper.width - 24);
  // ScrubNumber reserves space for three digits. Anchor to the visible
  // writing, not that empty space to the left of a two-digit weight.
  const written = weightEl.value.querySelector(".scrub-value").getBoundingClientRect();
  const centre = (written.left + weight.right) / 2;
  const scale = host.width / identity.value.offsetWidth;
  const left = Math.max(paper.left + 12, Math.min(centre - width / 2, paper.right - 12 - width));
  slipStyle.value = {
    left: `${(left - host.left) / scale}px`,
    top: `${(weight.bottom - host.top + 4) / scale}px`,
    width: `${width / scale}px`,
    "--slip-anchor": `${(centre - left) / scale}px`,
    transformOrigin: `${(centre - left) / scale}px 0`,
  };
};

const namePos = computed(() => scatter(`name-pos:${props.person.id}`, { r: 2.5, x: 3, y: 1 }));
const bodyPos = computed(() => scatter(`body-pos:${props.person.id}`, { r: 3, x: 2, y: 1 }));
const tallyPos = computed(() => scatter(`tally-pos:${props.person.id}`, { r: 4, x: 3, y: 2 }));

const toggleSex = () => {
  store.updatePerson(props.person.id, {
    gender: props.person.gender === "male" ? "female" : "male",
  });
};

const setWeight = (weight) => {
  store.updatePerson(props.person.id, { weight });
};

// Anywhere else on the paper puts the ruler away.
const closeOnOutside = (e) => {
  if (!slip.value?.contains(e.target) && !weightEl.value?.contains(e.target)) rulerOpen.value = false;
};
watch(rulerOpen, (open) => {
  if (open) {
    positionSlip();
    nextTick(() => {
      if (rulerOpen.value) document.addEventListener("pointerdown", closeOnOutside, true);
    });
    window.addEventListener("resize", positionSlip);
  } else {
    document.removeEventListener("pointerdown", closeOnOutside, true);
    window.removeEventListener("resize", positionSlip);
  }
});
watch(() => props.person.weight, () => {
  if (rulerOpen.value) positionSlip();
}, { flush: "post" });
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", closeOnOutside, true);
  window.removeEventListener("resize", positionSlip);
});

const updateName = (name) => {
  store.updatePerson(props.person.id, { name });
};
</script>

<template>
  <div ref="identity" class="relative">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="print text-[9px]" style="letter-spacing: 0.24em; color: var(--print-soft)">
          GUEST {{ String(seat).padStart(2, "0") }}
        </p>
        <div class="mt-1.5 origin-left" :style="namePos">
          <WriteOn
            :model-value="person.name"
            :seed="`name:${person.id}`"
            placeholder="who's this?"
            class="pen--hard text-[60px] leading-[0.7]"
            @update:model-value="updateName"
          />
        </div>
      </div>

      <!-- body and weight, written in by hand; tap either to change it -->
      <div class="flex shrink-0 flex-col items-end" :style="bodyPos">
        <p class="flex items-center gap-2">
          <button type="button" class="p-1" :aria-label="`Body for the math — ${person.gender}; tap to switch`" @click="toggleSex">
            <SexGlyph :kind="person.gender" :seed="String(person.id)" :size="22" />
          </button>
          <span ref="weightEl" class="pen text-[30px] leading-none">
            <ScrubNumber
              :model-value="person.weight"
              :min="30"
              :max="250"
              label="Weight in kilograms — drag sideways, or tap for the ruler"
              @update:model-value="setWeight"
              @tap="rulerOpen = !rulerOpen"
            /><span class="text-[20px]">kg</span>
          </span>
        </p>
        <!-- kept mounted from zero, so the very first stroke draws itself too -->
        <div v-show="pours" class="mt-2" :style="tallyPos">
          <TallyStrokes :count="pours" :seed="`total:${person.id}`" :size="22" color="var(--pen)" />
        </div>
      </div>
    </div>

    <!-- the printed ruler, torn off and laid over the paper — nothing shifts -->
    <Transition name="slip">
      <div v-if="rulerOpen" ref="slip" class="ruler-slip absolute z-[5] px-2 pb-1 pt-2" :style="slipStyle">
        <WeightRuler :model-value="person.weight" :min="30" :max="250" @update:model-value="setWeight" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ruler-slip {
  background: var(--paper, #f6f1e7);
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.06),
    0 8px 18px rgba(40, 25, 10, 0.28);
  transform: rotate(-1.2deg);
}
.ruler-slip::before {
  content: "";
  position: absolute;
  left: var(--slip-anchor);
  top: -4px;
  width: 8px;
  height: 8px;
  background: var(--paper, #f6f1e7);
  transform: translateX(-50%) rotate(45deg);
}
.slip-enter-active,
.slip-leave-active {
  transition:
    opacity 160ms ease,
    transform 200ms cubic-bezier(0.2, 1.2, 0.4, 1);
}
.slip-enter-from,
.slip-leave-to {
  opacity: 0;
  transform: translateY(-6px) rotate(-2.5deg);
}
</style>
