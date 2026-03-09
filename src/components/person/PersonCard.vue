<script setup>
import { useAlcoholStore } from "../../stores/alcohol";
import { triggerHaptic } from "../../utils/haptics";
import PersonBasicInfo from "./PersonBasicInfo.vue";
import PersonStatus from "./PersonStatus.vue";
import DrinkControls from "./DrinkControls.vue";
import DrinkTimeline from "./DrinkTimeline.vue";

const store = useAlcoholStore();

const props = defineProps({
  person: {
    type: Object,
    required: true,
  },
  canRemove: {
    type: Boolean,
    default: true,
  },
});

const handlePersonUpdate = (updates) => {
  store.updatePerson({ id: props.person.id, ...updates });
};

const handleRemovePerson = () => {
  store.removePerson(props.person.id);
  triggerHaptic("warning");
};
</script>

<template>
  <article class="tracker-person-card enter-rise" :style="{ '--person-color': person.color }">
    <div class="space-y-2">
      <div class="flex items-start justify-between gap-4">
        <PersonBasicInfo :person="person" @update="handlePersonUpdate" />
        <button
          v-if="canRemove"
          @click="handleRemovePerson"
          class="icon-button"
          aria-label="Remove person"
        >
          ×
        </button>
      </div>

      <div class="grid gap-2.5 sm:grid-cols-[1.15fr_1fr]">
        <PersonStatus class="relative z-20" :person-id="person.id" />
        <DrinkControls class="relative z-10" :person-id="person.id" :person-color="person.color" />
      </div>
    </div>

    <div class="mt-2.5">
      <DrinkTimeline :person-id="person.id" :person-color="person.color" />
    </div>
  </article>
</template>
