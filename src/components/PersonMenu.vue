<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { triggerHaptic } from "../utils/haptics";

// Who this window belongs to, Persona-menu style: tilted plates on a blood
// slash. Name, weight and body only feed the maths; the rest are exits.
const props = defineProps({ person: { type: Object, required: true } });
const emit = defineEmits(["close"]);
const store = useSessionStore();

const name = ref(props.person.name ?? "");
const saveName = () => store.updatePerson(props.person.id, { name: name.value.trim() });

const nudgeWeight = (delta) => {
  triggerHaptic("selection");
  const weight = Math.min(250, Math.max(35, (props.person.weight || 70) + delta));
  store.updatePerson(props.person.id, { weight });
};

const setBody = (gender) => {
  triggerHaptic("selection");
  store.updatePerson(props.person.id, { gender });
};

const canLeave = computed(() => store.activePeople.length > 1);
const leave = () => {
  if (store.deactivatePerson(props.person.id)) {
    triggerHaptic("selection");
    emit("close");
  }
};

const anyPours = computed(() => store.session.events.length > 0);
const closing = ref(false);
const closeTab = () => {
  if (!anyPours.value) return;
  if (!closing.value) {
    closing.value = true;
    triggerHaptic("warning");
    return;
  }
  store.closeTab();
  triggerHaptic("success");
  emit("close");
};

const done = () => {
  saveName();
  emit("close");
};
</script>

<template>
  <div class="sheet" role="dialog" aria-label="Who's this" @click.self="done">
    <p class="plate plate--dark slab text-sm" style="animation: rise-in 240ms var(--ease-out) both"><span>who's this</span></p>

    <input
      v-model="name"
      class="bare-input slab mt-5 text-[3.6rem]"
      placeholder="name them"
      autocomplete="off"
      maxlength="18"
      @blur="saveName"
      @keydown.enter="($event.target).blur()"
    />

    <div class="row" style="animation-delay: 60ms">
      <span class="label mono">WEIGHT</span>
      <div class="flex items-baseline gap-4">
        <button type="button" class="nudge slab" @click="nudgeWeight(-1)">−</button>
        <span class="slab text-6xl">{{ person.weight }}</span>
        <span class="mono text-sm" style="color: var(--bone-2)">kg</span>
        <button type="button" class="nudge slab" @click="nudgeWeight(1)">+</button>
      </div>
    </div>

    <div class="row" style="animation-delay: 120ms">
      <span class="label mono">BODY <em class="not-italic" style="color: var(--bone-3)">· for the maths</em></span>
      <div class="flex gap-4">
        <button
          v-for="g in ['male', 'female']"
          :key="g"
          type="button"
          class="plate slab text-2xl"
          :class="person.gender === g ? '' : 'plate--dark'"
          @click="setBody(g)"
        ><span>{{ g }}</span></button>
      </div>
    </div>

    <div class="mt-14 flex flex-col items-start gap-6">
      <button
        v-if="canLeave"
        type="button"
        class="plate plate--dark slab text-2xl"
        style="animation: rise-in 280ms var(--ease-out) 180ms both; margin-left: 10px"
        @click="leave"
      ><span>{{ person.name?.trim() || "they" }} left the bar</span></button>

      <button
        v-if="anyPours"
        type="button"
        class="plate slab text-3xl"
        :class="closing ? 'plate--blood' : 'plate--dark'"
        style="animation: rise-in 280ms var(--ease-out) 240ms both; margin-left: 24px"
        @click="closeTab"
      ><span>{{ closing ? "tap again · close it" : "close the tab" }}</span></button>

      <button
        type="button"
        class="plate plate--gold slab text-3xl"
        style="animation: rise-in 280ms var(--ease-out) 300ms both; margin-left: 38px"
        @click="done"
      ><span>done</span></button>
    </div>
  </div>
</template>

<style scoped>
.row {
  margin-top: 2.2rem;
  animation: rise-in 280ms var(--ease-out) both;
}
.label {
  display: block;
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--bone-2);
  margin-bottom: 0.4rem;
}
.nudge {
  background: none;
  border: 0;
  color: var(--gold);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 2.4rem;
  width: 2.4rem;
  line-height: 1;
}
</style>
