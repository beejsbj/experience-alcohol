<script setup>
import { computed, nextTick, ref } from "vue";
import { encode } from "uqr";
import { parseRoomCode, useRoomStore } from "../stores/room";
import { triggerHaptic } from "../utils/haptics";
import WriteOn from "./WriteOn.vue";

// The table's beer coaster. Solo, it asks which way you're going: open this
// table to friends, or flip it over and write in the code from theirs. At a
// table, it shows the way in three ways — a QR for their camera, the code
// round the rim to read out, and the link to send.
const emit = defineEmits(["close"]);
const room = useRoomStore();

const flipped = ref(false);
const typed = ref("");
const codeEl = ref(null);
const wrong = ref(false);

const qr = computed(() => {
  if (!room.link) return null;
  const { data, size } = encode(room.link, { ecc: "M", border: 1 });
  let path = "";
  data.forEach((row, y) => row.forEach((on, x) => { if (on) path += `M${x} ${y}h1v1h-1z`; }));
  return { path, size };
});

const shortLink = computed(() => room.link?.replace(/^https?:\/\//, "") ?? "");

const open = async () => {
  triggerHaptic("selection");
  await room.startRoom();
};

// Turning the coaster over: squash it edge-on, swap sides, open it back up.
const turning = ref(false);
const turn = (toBack) => {
  turning.value = true;
  triggerHaptic("selection");
  setTimeout(() => {
    flipped.value = toBack;
  }, 230);
  setTimeout(() => {
    turning.value = false;
    if (toBack) codeEl.value?.focus();
  }, 480);
};
const flipToJoin = () => turn(true);

const sitDown = async () => {
  const code = parseRoomCode(typed.value);
  if (!code) {
    wrong.value = true;
    triggerHaptic("warning");
    return;
  }
  triggerHaptic("success");
  emit("close");
  await nextTick();
  await room.joinRoom(code);
};

const copied = ref(null);
const copy = async (what) => {
  triggerHaptic("selection");
  try {
    await navigator.clipboard.writeText(what === "code" ? room.code : room.link);
    copied.value = what;
    setTimeout(() => { copied.value = null; }, 1600);
  } catch {
    copied.value = null;
  }
};
const share = async () => {
  triggerHaptic("selection");
  if (!navigator.share) return copy("link");
  try {
    await navigator.share({ title: "pull up a chair", text: `our table's code: ${room.code}`, url: room.link });
  } catch {
    // dismissed the share sheet
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
  <div class="keepsake flex-col" style="background: rgba(8, 4, 2, 0.86)" role="dialog" aria-label="The table's coaster" @click.self="emit('close')">
    <div class="coaster-flip" :class="{ 'is-turning': turning }">
      <!-- ── front ─────────────────────────────────────────── -->
      <div v-if="!flipped || room.inRoom" class="coaster-big coaster-face">
        <svg viewBox="0 0 320 320" class="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <path id="coaster-rim" d="M160 160 m-134 0 a134 134 0 1 1 268 0 a134 134 0 1 1 -268 0" />
          </defs>
          <circle cx="160" cy="160" r="152" fill="none" stroke="var(--ink)" stroke-width="3" />
          <circle cx="160" cy="160" r="146" fill="none" stroke="var(--ink)" stroke-width="1" />
          <circle cx="160" cy="160" r="118" fill="none" stroke="var(--ink)" stroke-width="1.2" stroke-dasharray="2 4" />
          <text font-size="13" fill="var(--ink)" class="print" style="letter-spacing: 0.34em; font-weight: 700">
            <textPath href="#coaster-rim">
              {{ room.inRoom ? `THE TABLE · ${room.code?.toUpperCase()} · PEER TO PEER · NO SERVER KEEPS IT ·` : "PULL UP A CHAIR · BRING A FRIEND · PEER TO PEER · NO SERVER ·" }}
            </textPath>
          </text>
        </svg>

        <!-- at a table: the way in -->
        <div v-if="room.inRoom" class="relative flex h-full flex-col items-center justify-center">
          <svg
            v-if="qr"
            :viewBox="`0 0 ${qr.size} ${qr.size}`"
            width="128"
            height="128"
            shape-rendering="crispEdges"
            aria-label="QR code for the table link"
            style="mix-blend-mode: multiply"
          >
            <path :d="qr.path" fill="#2a1b14" />
          </svg>
          <button type="button" class="dots mt-2 text-[21px]" style="color: var(--ink); letter-spacing: 0.08em" aria-label="Copy the table code" @click="copy('code')">
            {{ room.code?.toUpperCase() }}
          </button>
          <p class="pen text-[17px]" style="color: #6b5a44">{{ copied === "code" ? "code copied!" : "read it out, or scan" }}</p>
        </div>

        <!-- solo: which way are we going? -->
        <div v-else class="relative flex h-full flex-col items-center justify-center gap-5 px-12 text-center">
          <p class="print text-[8.5px]" style="letter-spacing: 0.2em; color: var(--ink)">DRINKING WITH FRIENDS?</p>
          <button type="button" class="pen pen--hard text-[30px] leading-[0.95]" style="color: #2b3a8f" @click="open">
            open this table<br />to friends →
          </button>
          <span class="pen text-[18px]" style="color: #6b5a44">— or —</span>
          <button type="button" class="pen pen--hard text-[30px] leading-[0.95]" style="color: #2b3a8f" @click="flipToJoin">
            sit at a<br />friend's table ↻
          </button>
        </div>
      </div>

      <!-- ── back: write their code in ─────────────────────── -->
      <div v-else class="coaster-big coaster-face coaster-back">
        <div class="relative flex h-full flex-col items-center justify-center px-12 text-center">
          <p class="print text-[9px]" style="letter-spacing: 0.3em; color: var(--ink)">THEIR TABLE'S CODE</p>
          <div class="mt-3 min-h-[44px] w-full border-b border-dashed" style="border-color: rgba(156, 47, 34, 0.5)">
            <WriteOn
              ref="codeEl"
              v-model="typed"
              seed="join-code"
              placeholder="xxxxx-xxxxx"
              class="text-[34px]"
              color="#2b3a8f"
              @update:model-value="wrong = false"
            />
          </div>
          <p class="pen mt-2 text-[17px]" :style="{ color: wrong ? '#b3261e' : '#6b5a44' }">
            {{ wrong ? "hmm — that's not a table code" : "or paste the link they sent" }}
          </p>
          <button type="button" class="pen pen--hard mt-4 text-[32px]" style="color: #2b3a8f" @click="sitDown">sit down →</button>
          <button type="button" class="pen mt-2 text-[17px]" style="color: #6b5a44" @click="turn(false)">↻ flip back</button>
        </div>
      </div>
    </div>

    <!-- at a table: the link itself, to send any way you like -->
    <template v-if="room.inRoom">
      <p class="print mt-6 max-w-[320px] break-all text-center text-[10px]" style="letter-spacing: 0.08em; color: var(--amber-soft)">{{ shortLink }}</p>
      <div class="mt-2 flex items-center gap-6">
        <button type="button" class="pen text-[26px] underline decoration-wavy underline-offset-4" style="color: var(--amber)" @click="copy('link')">
          {{ copied === "link" ? "copied!" : "copy link" }}
        </button>
        <button type="button" class="pen text-[26px] underline decoration-wavy underline-offset-4" style="color: var(--amber)" @click="share">send it →</button>
      </div>

      <p class="pen mt-6 text-center text-[26px]" :style="{ color: room.status === 'connected' ? 'var(--amber)' : 'var(--amber-soft)' }">
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
        class="pen mt-5 text-[21px] underline decoration-wavy underline-offset-4"
        :style="{ color: leaving ? '#e8836a' : 'var(--amber-soft)' }"
        @click="leave"
      >
        {{ leaving ? "tap again to leave the table" : "leave the table" }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.coaster-flip {
  position: relative;
  width: min(320px, 86vw);
  aspect-ratio: 1;
  transform: rotate(-6deg);
  animation: scrap-in 320ms cubic-bezier(0.2, 1.2, 0.4, 1) both;
  --ink: #9c2f22;
}
.coaster-flip.is-turning {
  animation: coaster-turn 480ms ease-in-out both;
}
@keyframes coaster-turn {
  0% {
    transform: rotate(-6deg) scaleX(1);
  }
  48%,
  52% {
    transform: rotate(-6deg) scaleX(0.02);
  }
  100% {
    transform: rotate(-6deg) scaleX(1);
  }
}
.coaster-face {
  position: absolute;
  inset: 0;
}
.coaster-big {
  border-radius: 50%;
  background:
    radial-gradient(ellipse at 35% 25%, rgba(255, 255, 255, 0.45), transparent 55%),
    radial-gradient(circle, transparent 60%, rgba(120, 80, 40, 0.12) 100%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.3 0 0 0 0 0.18 0 0 0 0.16 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23p)'/%3E%3C/svg%3E"),
    #ecdfc6;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.6), inset 0 0 0 2px rgba(255, 255, 255, 0.3);
}
.coaster-back.coaster-big {
  background:
    radial-gradient(ellipse at 65% 25%, rgba(255, 255, 255, 0.35), transparent 55%),
    repeating-radial-gradient(circle at 50% 50%, rgba(120, 90, 50, 0.07) 0 2px, transparent 2px 7px),
    #e6d6b8;
}
</style>
