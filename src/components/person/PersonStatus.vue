<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { usedrinks } from "../../composables/usedrinks";
import { useperson } from "../../composables/useperson";
import { triggerHaptic } from "../../utils/haptics";

const props = defineProps({
  personId: {
    type: Number,
    required: true,
  },
});

const {
  getCurrentFeelingDetails,
  getCurrentFeelingState,
  getDisplayedMaintainDetails,
  getMaintainOptions,
  getMaintainStatusCopy,
  getMaintainTargetDetails,
  getRecommendation,
  getBACColorClass,
  isMaintaining,
  setMaintainTarget,
  clearMaintainTarget,
} = useperson();
const { getPersonBAC } = usedrinks();

const menuRef = ref(null);
const menuOpen = ref(false);
const currentBACValue = computed(() => Number(getPersonBAC(props.personId) ?? 0));
const feelingDetails = computed(() => getCurrentFeelingDetails(props.personId));
const currentBACLabel = computed(() => `${currentBACValue.value.toFixed(3)}%`);
const maintainOptions = computed(() => getMaintainOptions());
const maintainTargetDetails = computed(() => getMaintainTargetDetails(props.personId));
const displayedMaintainDetails = computed(() =>
  getDisplayedMaintainDetails(props.personId)
);
const maintainIsActive = computed(() => isMaintaining(props.personId));
const maintainStatus = computed(() => getMaintainStatusCopy(props.personId));

const toggleMaintain = () => {
  if (maintainIsActive.value) {
    clearMaintainTarget(props.personId);
    triggerHaptic("selection");
    return;
  }

  setMaintainTarget(props.personId, displayedMaintainDetails.value.state);
  triggerHaptic("selection");
};

const selectMaintainTarget = (stateName) => {
  setMaintainTarget(props.personId, stateName);
  menuOpen.value = false;
  triggerHaptic("selection");
};

const handleDocumentClick = (event) => {
  if (!menuRef.value?.contains(event.target)) {
    menuOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleDocumentClick);
});
</script>

<template>
  <div class="tracker-panel tracker-panel--soft relative z-[3] space-y-2.5">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <p class="surface-label">Current state</p>
        <span class="live-dot"></span>
      </div>
      <span class="stat-pill">
        {{ getCurrentFeelingState(personId) }}
      </span>
    </div>
    <div class="space-y-1.5">
      <div class="flex items-end gap-2">
        <span :class="[getBACColorClass(currentBACValue), 'text-3xl font-semibold tracking-tight']">
          {{ currentBACLabel }}
        </span>
        <p class="text-[11px] leading-4 text-[color:var(--muted)]">
          {{ feelingDetails.description }}
        </p>
      </div>
    </div>
    <div class="maintain-bar" ref="menuRef">
      <button
        class="maintain-lock"
        :class="{ 'maintain-lock--active': maintainIsActive }"
        @click.stop="toggleMaintain"
      >
        {{ maintainIsActive ? "Clear" : "Lock" }}
      </button>
      <button class="maintain-pill" @click.stop="menuOpen = !menuOpen">
        <span class="maintain-pill__label">
          {{
            maintainTargetDetails?.state || displayedMaintainDetails.state
          }}
        </span>
        <span class="maintain-pill__meta">
          {{ maintainIsActive ? "Holding" : "Target" }}
        </span>
        <span class="maintain-pill__caret" :class="{ 'rotate-180': menuOpen }">
          v
        </span>
      </button>

      <div v-if="menuOpen" class="maintain-menu">
        <button
          v-for="option in maintainOptions"
          :key="option.state"
          class="maintain-option"
          :class="{
            'maintain-option--active':
              (maintainTargetDetails?.state || displayedMaintainDetails.state) ===
              option.state,
          }"
          @click.stop="selectMaintainTarget(option.state)"
        >
          <span>{{ option.state }}</span>
          <span class="maintain-option__range">
            {{ option.minBAC.toFixed(2) }}-{{ option.maxBAC.toFixed(2) }}%
          </span>
        </button>
      </div>
    </div>
    <p class="maintain-copy">{{ maintainStatus }}</p>
    <p class="rounded-[14px] border border-[color:var(--line)] bg-white/65 px-2.5 py-2 text-xs leading-5 text-[color:var(--ink)]">
      {{ getRecommendation(personId) }}
    </p>
  </div>
</template>
