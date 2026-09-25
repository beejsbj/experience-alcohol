<script setup>
import { computed, ref } from "vue";
import { encode } from "uqr";
import { useRoomStore } from "../stores/room";
import { triggerHaptic } from "../utils/haptics";
import { polar } from "../utils/dial";
import { GLASS } from "../utils/window";

// Twelve jewels round the rim, one per hour, in the bar's glass.
const JEWELS = [GLASS.beer, GLASS.wine, GLASS.cocktail, GLASS.shot, GLASS.custom];
const jewels = Array.from({ length: 12 }, (_, h) => {
  const at = polar(150, 150, 136, ((h + 0.5) / 12) * Math.PI * 2);
  return { key: h, x: at.x, y: at.y, fill: JEWELS[h % JEWELS.length] };
});

// The table's invitation: a QR set into a medallion, like a boss in a vault.
const emit = defineEmits(["close"]);
const room = useRoomStore();

const qr = computed(() => {
  if (!room.link) return null;
  const { data, size } = encode(room.link, { ecc: "M", border: 0 });
  let path = "";
  data.forEach((row, y) => row.forEach((on, x) => { if (on) path += `M${x} ${y}h1v1h-1z`; }));
  return { path, size };
});

const copied = ref(false);
const share = async () => {
  triggerHaptic("selection");
  if (navigator.share) {
    try {
      await navigator.share({ title: "pull up a chair", url: room.link });
      return;
    } catch {
      // share sheet dismissed: copy instead
    }
  }
  try {
    await navigator.clipboard.writeText(room.link);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1600);
  } catch {
    copied.value = false;
  }
};

const who = computed(() =>
  room.status === "connected" ? `${room.peerCount + 1} phones at this table` : "waiting for someone to sit down"
);

const leaving = ref(false);
const leave = () => {
  if (!leaving.value) {
    leaving.value = true;
    return;
  }
  room.leaveRoom();
  emit("close");
};
</script>

<template>
  <div class="sheet" role="dialog" aria-label="Invite to the table" @click.self="emit('close')">
    <p class="plate slab text-2xl"><span>pull up a chair</span></p>

    <div class="medallion" v-if="qr">
      <svg viewBox="0 0 300 300" class="medallion__svg" aria-label="QR code for the table link">
        <circle cx="150" cy="150" r="146" class="medallion__stone" />
        <circle cx="150" cy="150" r="146" class="medallion__edge" />
        <circle cx="150" cy="150" r="136" class="medallion__gold" />
        <circle v-for="j in jewels" :key="j.key" :cx="j.x" :cy="j.y" r="4.5" :fill="j.fill" class="medallion__jewel" />
        <rect x="58" y="58" width="184" height="184" fill="var(--bone)" rx="2" />
        <svg x="66" y="66" width="168" height="168" :viewBox="`0 0 ${qr.size} ${qr.size}`" shape-rendering="crispEdges">
          <path :d="qr.path" fill="var(--lead)" />
        </svg>
      </svg>
    </div>

    <p class="slab mt-6 text-center text-5xl tracking-wider">{{ room.code }}</p>

    <div class="mt-6 flex justify-center">
      <button type="button" class="plate plate--gold slab text-2xl" @click="share">
        <span>{{ copied ? "copied" : "send the link" }}</span>
      </button>
    </div>

    <p class="display mt-9 text-balance text-center text-3xl" :style="{ color: room.status === 'connected' ? 'var(--gold)' : 'var(--bone-2)' }">
      {{ who }}
    </p>
    <p v-if="room.error" class="mono mt-2 text-center text-xs" style="color: var(--blood)">
      couldn't reach them directly — same wifi helps
    </p>
    <p class="mono mt-3 text-center text-[11px]" style="color: var(--bone-3)">
      phone to phone · no server keeps the night · keep both apps open
    </p>

    <button type="button" class="mono mx-auto mt-10 block text-xs underline" :style="{ color: leaving ? 'var(--blood)' : 'var(--bone-2)' }" @click="leave">
      {{ leaving ? "tap again to leave the table" : "leave the table" }}
    </button>
  </div>
</template>

<style scoped>
.medallion {
  width: min(78vw, 320px);
  margin: 2.2rem auto 0;
  animation: medallion-in 520ms var(--ease-spring) both;
}
.medallion__svg {
  width: 100%;
  height: auto;
  display: block;
  filter: drop-shadow(0 0 40px rgba(231, 184, 76, 0.25));
}
.medallion__stone { fill: var(--stone); }
.medallion__edge { fill: none; stroke: var(--lead); stroke-width: 6; }
.medallion__jewel { stroke: var(--lead); stroke-width: 1.5; }
.medallion__gold { fill: none; stroke: var(--gold); stroke-width: 2; stroke-dasharray: 2 7; stroke-linecap: round; }
@keyframes medallion-in {
  from { opacity: 0; transform: rotate(-40deg) scale(0.8); }
  to { opacity: 1; transform: rotate(0) scale(1); }
}
</style>
