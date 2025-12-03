<script setup>
import { computed } from "vue";
import { usedrinks } from "../../composables/usedrinks";
import { useperson } from "../../composables/useperson";
import { useAlcoholStore } from "../../stores/alcohol";
import PersonBasicInfo from "./PersonBasicInfo.vue";
import PersonStatus from "./PersonStatus.vue";
import DrinksConsumed from "./DrinksConsumed.vue";
import DrinkControls from "./DrinkControls.vue";
import DrinkTimeline from "./DrinkTimeline.vue";

const store = useAlcoholStore();

const props = defineProps({
  person: {
    type: Object,
    required: true,
  },
  isLive: {
    type: Boolean,
    default: true,
  },
  canRemove: {
    type: Boolean,
    default: true,
  },
  referencePerson: {
    type: Object,
    required: true,
  },
});

const { getPersonBAC } = usedrinks();
const { setMaintainLevel, clearMaintainLevel } = useperson();

const currentBAC = computed(() => getPersonBAC(props.person.id));

const handlePersonUpdate = (updates) => {
  store.updatePerson({ id: props.person.id, ...updates });
};

const handleSetMaintainLevel = () => {
  setMaintainLevel(props.person);
};

const handleClearMaintainLevel = () => {
  clearMaintainLevel(props.person);
};
</script>

<template>
  <div
    class="p-4 rounded-lg shadow"
    :style="{ backgroundColor: person.color + '20' }"
  >
    <!-- Header with editable basic info -->
    <div class="space-y-4 mb-6">
      <div class="flex justify-between items-start">
        <PersonBasicInfo :person="person" @update="handlePersonUpdate" />
        <button
          v-if="canRemove"
          @click="store.removePerson(person.id)"
          class="text-red-500 hover:text-red-700"
        >
          Remove
        </button>
      </div>

      <!-- Status Section -->
      <PersonStatus
        :person-id="person.id"
        :current-bac="currentBAC"
        :maintain-bac="person.maintainBAC"
        @set-maintain-level="handleSetMaintainLevel"
        @clear-maintain-level="handleClearMaintainLevel"
      />

      <!-- Drinks Consumed -->
      <DrinksConsumed :person-id="person.id" />
    </div>

    <!-- Drink Controls -->
    <div class="mb-4">
      <DrinkControls :person-id="person.id" :person-color="person.color" />
    </div>

    <!-- Timeline -->
    <DrinkTimeline :person-id="person.id" :person-color="person.color" />
  </div>
</template>
