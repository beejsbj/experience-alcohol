<script setup>
import { computed, ref } from "vue";
import { encode } from "uqr";
import { useRoomStore } from "../stores/room";
import { triggerHaptic } from "../utils/haptics";

// The invite is a beer coaster: the table's code printed round the rim, a
// QR in the middle for a friend's camera, and the pen doing the talking.
const emit = defineEmits(["close"]);
const room = useRoomStore();

const qr = computed(() => {
  if (!room.link) return null;
  const { data, size } = encode(room.link, { ecc: "M", border: 1 });
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
      // dismissed the share sheet — fall back to copying
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

const leaving = ref(false);
const leave = () => {
  if (!leaving.value) {
    leaving.value = true;
    return;
  }
  room.leaveRoom();
  emit("close");
};

const who = computed(() => {
  if (room.status === "connected") return `${room.peerCount + 1} phones at the table`;
  return "waiting for a friend…";
});
</script>

<template>
  <div class="keepsake flex-col" style="background: rgba(8, 4, 2, 0.84)" role="dialog" aria-label="Invite to the table" @click.self="emit('close')">
    <div class="coaster-big" style="--ink: #9c2f22">
      <svg viewBox="0 0 320 320" class="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <path id="coaster-rim" d="M160 160 m-134 0 a134 134 0 1 1 268 0 a134 134 0 1 1 -268 0" />
        </defs>
        <circle cx="160" cy="160" r="152" fill="none" stroke="var(--ink)" stroke-width="3" />
        <circle cx="160" cy="160" r="146" fill="none" stroke="var(--ink)" stroke-width="1" />
        <circle cx="160" cy="160" r="118" fill="none" stroke="var(--ink)" stroke-width="1.2" stroke-dasharray="2 4" />
        <text font-size="13" fill="var(--ink)" class="print" style="letter-spacing: 0.34em; font-weight: 700">
          <textPath href="#coaster-rim">THE TABLE · {{ room.code?.toUpperCase() }} · PEER TO PEER · NO SERVER KEEPS IT ·</textPath>
        </text>
      </svg>

      <div class="relative flex h-full flex-col items-center justify-center">
        <svg
          v-if="qr"
          :viewBox="`0 0 ${qr.size} ${qr.size}`"
          width="138"
          height="138"
          shape-rendering="crispEdges"
          aria-label="QR code for the table link"
          style="mix-blend-mode: multiply"
        >
          <path :d="qr.path" fill="#2a1b14" />
        </svg>
        <p class="dots mt-2 text-[20px]" style="color: var(--ink); letter-spacing: 0.08em">{{ room.code?.toUpperCase() }}</p>
        <button type="button" class="pen mt-1 text-[24px]" style="color: #2b3a8f" @click="share">
          {{ copied ? "copied!" : "or send the link →" }}
        </button>
      </div>
    </div>

    <p class="pen mt-7 text-center text-[28px]" :style="{ color: room.status === 'connected' ? 'var(--amber)' : 'var(--amber-soft)' }">
      {{ who }}
    </p>
    <p v-if="room.error" class="pen mt-1 text-center text-[20px]" style="color: #e8836a">
      couldn't reach them directly — same wifi helps
    </p>
    <p class="print mt-2 text-center text-[9px]" style="letter-spacing: 0.24em; color: var(--amber-soft)">
      BOTH PHONES OPEN · POURS SYNC LIVE
    </p>

    <button
      type="button"
      class="pen mt-6 text-[22px] underline decoration-wavy underline-offset-4"
      :style="{ color: leaving ? '#e8836a' : 'var(--amber-soft)' }"
      @click="leave"
    >
      {{ leaving ? "tap again to leave the table" : "leave the table" }}
    </button>
  </div>
</template>

<style scoped>
.coaster-big {
  position: relative;
  width: min(320px, 86vw);
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 35% 25%, rgba(255, 255, 255, 0.45), transparent 55%),
    radial-gradient(circle, transparent 60%, rgba(120, 80, 40, 0.12) 100%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0 0.18 0 0 0 0.16 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23p)'/%3E%3C/svg%3E"),
    #ecdfc6;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.6), inset 0 0 0 2px rgba(255, 255, 255, 0.3);
  transform: rotate(-6deg);
  animation: scrap-in 320ms cubic-bezier(0.2, 1.2, 0.4, 1) both;
}
</style>
