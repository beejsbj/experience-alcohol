<script setup>
import { useSessionStore } from "../stores/session";
import { MAINTAINABLE_STATES } from "../constants";
import { triggerHaptic } from "../utils/haptics";

// Pin the feeling you want to hold. The window draws it as a gold halo, and
// pour timings aim to keep you inside it.
const props = defineProps({ person: { type: Object, required: true } });
const emit = defineEmits(["close"]);
const store = useSessionStore();

const BLURBS = {
  "Barely Noticeable": "a warm edge. still you.",
  "Pleasantly Relaxed": "the glow. talk comes easy.",
  "Definitely Tipsy": "loose, loud, laughing.",
};

const pin = (state) => {
  store.pinVibe(props.person.id, state);
  triggerHaptic("selection");
  emit("close");
};
</script>

<template>
  <div class="sheet" role="dialog" aria-label="Hold a vibe" @click.self="emit('close')">
    <p class="plate slab text-2xl"><span>hold me at</span></p>

    <div class="mt-12 flex flex-col gap-9">
      <button
        v-for="(s, i) in MAINTAINABLE_STATES"
        :key="s.state"
        type="button"
        class="vibe"
        :class="{ 'is-held': person.pinnedState === s.state }"
        :style="{ animationDelay: `${80 + i * 70}ms`, marginLeft: `${i * 14}px` }"
        @click="pin(s.state)"
      >
        <span class="display block text-[2.9rem] leading-[0.95]">{{ s.state.toLowerCase() }}</span>
        <span class="mono mt-2 block text-xs" style="color: var(--bone-2)">
          {{ BLURBS[s.state] }} · {{ s.minBAC.toFixed(2) }}–{{ s.maxBAC.toFixed(2) }}%
        </span>
      </button>
    </div>

    <button
      type="button"
      class="plate plate--dark slab mt-14 text-xl"
      style="animation: rise-in 300ms var(--ease-out) 320ms both"
      @click="pin(null)"
    ><span>let it drift</span></button>
  </div>
</template>

<style scoped>
.vibe {
  text-align: left;
  background: none;
  border: 0;
  color: var(--bone);
  padding: 0;
  animation: rise-in 320ms var(--ease-out) both;
}
.vibe.is-held .display {
  color: var(--gold);
  text-shadow: 0 0 24px rgba(231, 184, 76, 0.45);
}
.vibe.is-held .display::before {
  content: "✦ ";
  font-style: normal;
  font-size: 0.5em;
  vertical-align: middle;
}
</style>
