<script setup>
import { reactive, ref } from "vue";
import { useAlcoholStore } from "../../stores/alcohol";
import { usedrinks } from "../../composables/usedrinks";
import { triggerHaptic } from "../../utils/haptics";

const props = defineProps({
  personId: {
    type: Number,
    required: true,
  },
  personColor: {
    type: String,
    required: true,
  },
});

const store = useAlcoholStore();
const showCustomDrinkForm = ref(false);
const customDrink = reactive({
  type: "",
  alcoholContent: 5,
  volume: 12,
});
const {
  drinks,
  getDrinkCount,
  addDrink,
  getNextDrinkTime,
  getNextDrinkClass,
  getNextDrinkTintClass,
} = usedrinks();

const handleAddDrink = (drink) => {
  addDrink(drink, { id: props.personId });
  triggerHaptic("tap");
};

const handleAddCustomDrink = () => {
  const name = customDrink.type.trim();
  if (!name) return;

  store.addCustomDrink({
    type: name,
    alcoholContent: Number(customDrink.alcoholContent) / 100,
    volume: Number(customDrink.volume),
  });
  triggerHaptic("success");

  customDrink.type = "";
  customDrink.alcoholContent = 5;
  customDrink.volume = 12;
  showCustomDrinkForm.value = false;
};
</script>

<template>
  <div class="tracker-panel space-y-2.5">
    <div class="flex items-center justify-between gap-2">
      <p class="surface-label">Quick log</p>
      <button
        class="quick-log-add-type"
        @click="showCustomDrinkForm = !showCustomDrinkForm"
      >
        <span class="quick-log-add-type__icon">+</span>
        <span>{{ showCustomDrinkForm ? "Close" : "Drink" }}</span>
      </button>
    </div>

    <div v-if="showCustomDrinkForm" class="quick-log-form">
      <input
        v-model="customDrink.type"
        type="text"
        class="field-input"
        placeholder="Name"
      />
      <input
        v-model.number="customDrink.alcoholContent"
        type="number"
        class="field-input"
        min="1"
        max="60"
        step="1"
        placeholder="ABV %"
      />
      <input
        v-model.number="customDrink.volume"
        type="number"
        class="field-input"
        min="1"
        max="24"
        step="0.5"
        placeholder="oz"
      />
      <button class="primary-button justify-center" @click="handleAddCustomDrink">
        Save
      </button>
    </div>

    <div class="grid grid-cols-4 gap-1.5">
      <div
        v-for="drink in drinks"
        :key="drink.type"
        class="relative overflow-hidden rounded-[18px] border shadow-[0_10px_18px_rgba(138,92,53,0.08)]"
        :class="getNextDrinkTintClass(personId, drink)"
      >
        <span
          v-if="getDrinkCount(personId, drink.type) > 0"
          class="quick-drink-badge"
        >
          {{ getDrinkCount(personId, drink.type) }}
        </span>
        <button
          @click="handleAddDrink(drink)"
          :style="{ background: `linear-gradient(180deg, ${personColor}22, rgba(255,255,255,0.94))` }"
          class="quick-drink-card"
        >
          <img
            v-if="drink.icon"
            :src="drink.icon"
            :alt="drink.type"
            class="h-4 w-4"
          />
          <span v-else class="quick-drink-card__glyph">
            {{ drink.glyph || drink.type.charAt(0).toUpperCase() }}
          </span>
          <span class="quick-drink-card__label">{{ drink.type }}</span>
        </button>
        <div
          class="quick-drink-status"
          :class="getNextDrinkClass(personId, drink)"
        >
          {{ getNextDrinkTime(personId, drink) }}
        </div>
      </div>
    </div>
  </div>
</template>
