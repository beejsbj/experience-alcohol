<script setup>
import { onMounted, ref, watch } from "vue";
import { useRoomStore } from "./stores/room";
import NightView from "./components/NightView.vue";
import TableWall from "./components/TableWall.vue";
import Keepsake from "./components/Keepsake.vue";

const room = useRoomStore();
const view = ref("night"); // 'night' | 'table'

// Arriving by a friend's link: wait at the table until it shows up.
onMounted(() => room.resume());
watch(
  () => room.awaitingTable,
  (waiting) => { if (waiting) view.value = "table"; },
  { immediate: true }
);
</script>

<template>
  <div class="app">
    <div class="shaft" aria-hidden="true" />
    <div class="nave-grain" aria-hidden="true" />
    <Transition name="view" mode="out-in">
      <NightView v-if="view === 'night'" @table="view = 'table'" />
      <TableWall v-else @open="view = 'night'" />
    </Transition>
    <Keepsake />
  </div>
</template>

<style scoped>
.app {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  background: var(--nave);
}
/* A shaft of light falling from high up in the nave */
.shaft {
  position: fixed;
  inset: -10% 0 auto;
  height: 80vh;
  pointer-events: none;
  background: radial-gradient(ellipse 60% 70% at 50% 0%, rgba(245, 241, 232, 0.07), transparent 70%);
}
.view-enter-active,
.view-leave-active {
  transition: opacity 200ms ease, transform 240ms var(--ease-out);
}
.view-enter-from {
  opacity: 0;
  transform: scale(0.97);
}
.view-leave-to {
  opacity: 0;
  transform: scale(1.03);
}
</style>
