<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useRoomStore } from "../stores/room";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime } from "../utils/bac";
import { feelingFor, stampFor } from "../utils/feelings";
import RoseWindow from "./RoseWindow.vue";
import RoomMedallion from "./RoomMedallion.vue";

// Everyone's window on one wall. At a shared table this is also where a new
// phone says which window is theirs.
const emit = defineEmits(["open"]);
const store = useSessionStore();
const room = useRoomStore();
const now = useLiveNow();
const medallionOpen = ref(false);

const clock = computed(() =>
  new Date(now.value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
);

const windows = computed(() =>
  store.activePeople.map((person) => {
    const events = store.eventsFor(person.id);
    const bac = calculateBACAtTime(events, person, now.value);
    const stamp = stampFor(bac, person.pinnedState);
    return {
      person,
      events,
      bac,
      feeling: events.length ? feelingFor(bac).state.toLowerCase() : "empty glass",
      warn: stamp === "SLOW DOWN" || stamp === "CUT OFF" ? stamp : null,
      seat:
        !room.inRoom ? null
        : person.id === room.myPersonId ? "this phone"
        : room.heldElsewhere.has(person.id) ? "their phone"
        : null,
    };
  })
);

const needsSeat = computed(() => room.inRoom && !room.awaitingTable && !room.myPersonId);

const open = (id) => {
  if (needsSeat.value) room.claim(id);
  store.setFocus(id);
  emit("open");
};

const addPerson = () => {
  const id = store.addPerson({ name: "" });
  if (needsSeat.value) room.claim(id);
  emit("open");
};

const invite = async () => {
  if (!room.inRoom) await room.startRoom();
  medallionOpen.value = true;
};

const roomLine = computed(() => {
  if (!room.inRoom) return "pull up a chair for a friend";
  if (room.status === "connected") return `${room.peerCount + 1} phones at this table`;
  return "table open · waiting";
});
</script>

<template>
  <div class="wall">
    <header class="wall__head">
      <h1 class="slab wall__title">the<br />table</h1>
      <div class="text-right">
        <p class="mono text-xs" style="color: var(--bone-2)">{{ clock }}</p>
        <button type="button" class="back slab" @click="emit('open')">back to my glass →</button>
      </div>
    </header>

    <button type="button" class="invite" @click="invite">
      <span class="invite__dot" :class="{ 'is-live': room.status === 'connected' }" />
      <span class="display text-2xl">{{ roomLine }}</span>
    </button>

    <div v-if="room.awaitingTable" class="finding">
      <p class="display text-5xl">finding the table…</p>
      <p class="mono mt-3 text-xs" style="color: var(--bone-2)">keep their app open too</p>
    </div>

    <template v-else>
      <p v-if="needsSeat" class="plate plate--blood slab ml-6 mt-6 text-2xl"><span>which one's you?</span></p>

      <div class="grid">
        <button
          v-for="(w, i) in windows"
          :key="w.person.id"
          type="button"
          class="pane-card"
          :style="{ animationDelay: `${i * 60}ms` }"
          @click="open(w.person.id)"
        >
          <RoseWindow :person="w.person" :events="w.events" :now="now" detail="mini" />
          <span class="slab pane-card__name">{{ w.person.name?.trim() || "???" }}</span>
          <span class="display pane-card__feeling">{{ w.feeling }}</span>
          <span class="mono pane-card__meta">
            {{ w.events.length }} poured · {{ w.bac.toFixed(3) }}%
          </span>
          <span v-if="w.warn" class="plate plate--blood slab pane-card__warn"><span>{{ w.warn }}</span></span>
          <span v-if="w.seat" class="mono pane-card__seat">{{ w.seat }}</span>
        </button>

        <button type="button" class="pane-card pane-card--new" @click="addPerson">
          <span class="pane-card__empty"><span class="slab text-3xl">+</span></span>
          <span class="slab pane-card__name" style="color: var(--bone-2)">someone new</span>
        </button>
      </div>
    </template>

    <RoomMedallion v-if="medallionOpen" @close="medallionOpen = false" />
  </div>
</template>

<style scoped>
.wall {
  max-width: 560px;
  margin: 0 auto;
  height: 100dvh;
  overflow-y: auto;
  padding: max(1.2rem, env(safe-area-inset-top)) 0 max(2rem, env(safe-area-inset-bottom));
}
.wall__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0 1.4rem;
}
.wall__title {
  font-size: 5.2rem;
  line-height: 0.82;
  transform: rotate(-4deg);
  transform-origin: left bottom;
  text-shadow: 6px 6px 0 var(--blood);
  animation: rise-in 400ms var(--ease-out) both;
}
.back {
  margin-top: 0.6rem;
  background: none;
  border: 0;
  padding: 0;
  color: var(--gold);
  font-size: 1rem;
  letter-spacing: 0.06em;
}
.invite {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin: 1.6rem 1.4rem 0;
  background: none;
  border: 0;
  padding: 0;
  color: var(--bone);
  text-align: left;
}
.invite__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid var(--gold);
  flex: none;
}
.invite__dot.is-live {
  background: var(--gold);
  box-shadow: 0 0 10px var(--gold);
}
.finding {
  text-align: center;
  margin-top: 30vh;
  animation: breathe 2.4s ease-in-out infinite;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem 1.1rem;
  padding: 1.6rem 1.2rem 0;
}
.pane-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: none;
  border: 0;
  padding: 0;
  color: var(--bone);
  text-align: left;
  animation: rise-in 360ms var(--ease-out) both;
}
.pane-card:nth-child(even) {
  margin-top: 2.4rem;
}
.pane-card__name {
  margin-top: 0.6rem;
  font-size: 1.5rem;
}
.pane-card__feeling {
  font-size: 1.35rem;
  line-height: 1;
  margin-top: 0.1rem;
}
.pane-card__meta {
  margin-top: 0.35rem;
  font-size: 10px;
  color: var(--bone-2);
}
.pane-card__warn {
  position: absolute;
  top: 6%;
  right: -4px;
  font-size: 0.85rem;
}
.pane-card__seat {
  position: absolute;
  top: -1.1rem;
  left: 0;
  font-size: 10px;
  color: var(--gold);
}
.pane-card__empty {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 2px dashed var(--bone-3);
  display: grid;
  place-items: center;
  color: var(--bone-2);
}
@keyframes breathe {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
</style>
