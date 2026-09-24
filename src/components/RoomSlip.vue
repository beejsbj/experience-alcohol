<script setup>
import { computed, ref } from "vue";
import { encode } from "uqr";
import { useRoomStore } from "../stores/room";
import { scatter } from "../utils/scatter";
import { triggerHaptic } from "../utils/haptics";
import InkArrow from "./InkArrow.vue";

// The table's own receipt: printed code + QR for a friend's camera.
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
  if (room.status === "connected") {
    const n = room.peerCount + 1;
    return `${n} phones at the table`;
  }
  return "waiting for someone to sit down…";
});
</script>

<template>
  <div class="keepsake" role="dialog" aria-label="Invite to the table" @click.self="emit('close')">
    <div
      class="receipt-paper w-full p-5"
      style="max-width: 340px;"
      :style="scatter(`room-slip:${room.code}`, { r: 1.5, x: 4, y: 3 })"
    >
      <p class="masthead print">THE TABLE · PEER TO PEER · NO SERVER KEEPS IT</p>

      <p class="print mt-3 text-center text-2xl font-bold tracking-widest">{{ room.code }}</p>

      <svg
        v-if="qr"
        class="mx-auto mt-3 block"
        :viewBox="`0 0 ${qr.size} ${qr.size}`"
        width="200"
        height="200"
        shape-rendering="crispEdges"
        aria-label="QR code for the table link"
      >
        <path :d="qr.path" fill="var(--ink)" />
      </svg>

      <div class="mt-2 flex items-center justify-center gap-2">
        <InkArrow :seed="`room-scan:${room.code}`" dir="right" :width="30" :height="18" />
        <p class="scribble text-lg" style="color: var(--pen)">their camera, or</p>
        <button type="button" class="scribble text-lg underline decoration-wavy" style="color: var(--pen)" @click="share">
          {{ copied ? "copied!" : "send the link" }}
        </button>
      </div>

      <p class="print text-center text-[10px] my-3 tracking-widest" style="color: var(--faded)">· · · · · · · · · · · · · · · ·</p>

      <p class="scribble text-center text-xl" :style="{ color: room.status === 'connected' ? 'var(--greenink)' : 'var(--faded)' }">
        {{ who }}
      </p>
      <p v-if="room.error" class="print mt-1 text-center text-[10px]" style="color: var(--redpen)">
        couldn't reach them directly — same wifi helps
      </p>
      <p class="print mt-2 text-center text-[10px]" style="color: var(--faded)">
        keep the app open on both phones · pours sync live
      </p>

      <button
        type="button"
        class="print mx-auto mt-4 block text-[10px] underline"
        :style="{ color: leaving ? 'var(--redpen)' : 'var(--faded)' }"
        @click="leave"
      >
        {{ leaving ? "tap again to leave the table" : "leave the table" }}
      </button>
    </div>
  </div>
</template>
