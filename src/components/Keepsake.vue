<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { triggerHaptic } from "../utils/haptics";
import RoseWindow from "./RoseWindow.vue";

// Closing the tab leaves the finished windows: the night, in glass.
const store = useSessionStore();
const tab = computed(() => store.lastTab);
const closedAt = computed(() => new Date(tab.value.closedAt).getTime());
const windows = computed(() => tab.value.summary.filter((s) => s.person && s.events?.length));

const duration = computed(() => {
  const ms = closedAt.value - new Date(tab.value.startedAt).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.round((ms % 3600000) / 60000);
  return h ? `${h}h ${m}m` : `${m}m`;
});

const dateLine = computed(() =>
  new Date(tab.value.closedAt).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })
);

// Save one window as a picture: the SVG, framed and captioned on a canvas.
const saving = ref(null);
const save = async (entry, index) => {
  const svg = document.querySelector(`[data-keepsake="${index}"] svg`);
  if (!svg) return;
  saving.value = index;
  try {
    const W = 1080;
    const H = 1350;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0b0a10";
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, 560, 60, W / 2, 560, 620);
    glow.addColorStop(0, "rgba(231,184,76,0.22)");
    glow.addColorStop(1, "rgba(231,184,76,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const clone = svg.cloneNode(true);
    clone.setAttribute("width", "900");
    clone.setAttribute("height", "900");
    const css = getComputedStyle(document.documentElement);
    const vars = ["--lead", "--bone", "--gold"].map((v) => `${v}:${css.getPropertyValue(v)}`).join(";");
    clone.setAttribute("style", vars);
    inlineStyles(svg, clone);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    ctx.drawImage(img, 90, 110, 900, 900);
    URL.revokeObjectURL(url);

    ctx.fillStyle = "#f5f1e8";
    ctx.textAlign = "left";
    ctx.font = "96px Anton";
    ctx.fillText((entry.name?.trim() || "someone").toUpperCase(), 90, 1130);
    ctx.font = "italic 64px 'Bodoni Moda Variable'";
    ctx.fillText(`peaked ${entry.peakState.toLowerCase()}`, 90, 1210);
    ctx.font = "28px 'JetBrains Mono'";
    ctx.fillStyle = "rgba(245,241,232,0.6)";
    ctx.fillText(`${entry.drinks} poured · ${duration.value} · ${dateLine.value.toLowerCase()}`, 90, 1268);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], `night-${(entry.name || "glass").trim() || "glass"}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "the night, in glass" });
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    triggerHaptic("success");
  } catch {
    // share cancelled or the browser refused the canvas — nothing to do
  } finally {
    saving.value = null;
  }
};

// Scoped styles don't travel with a cloned SVG: copy the computed paint over.
function inlineStyles(source, target) {
  const props = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray", "stroke-linecap", "opacity", "mix-blend-mode", "font-family", "font-size", "letter-spacing", "text-anchor", "dominant-baseline"];
  const a = source.querySelectorAll("*");
  const b = target.querySelectorAll("*");
  a.forEach((el, i) => {
    const cs = getComputedStyle(el);
    b[i].setAttribute("style", props.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(";"));
  });
}
</script>

<template>
  <div v-if="tab" class="keepsake" role="dialog" aria-label="The night, in glass">
    <p class="plate plate--gold slab text-xl"><span>the night, in glass</span></p>
    <p class="mono mt-4 text-xs" style="color: var(--bone-2)">{{ dateLine.toLowerCase() }} · {{ duration }}</p>

    <p v-if="!windows.length" class="display mt-16 text-4xl">a quiet one. nothing poured.</p>

    <div class="keepsake__windows">
      <figure
        v-for="(entry, i) in windows"
        :key="i"
        class="keepsake__figure"
        :data-keepsake="i"
        :style="{ animationDelay: `${150 + i * 120}ms` }"
      >
        <RoseWindow :person="entry.person" :events="entry.events" :now="closedAt" :show-forecast="false" />
        <figcaption>
          <span class="slab block text-3xl">{{ entry.name?.trim() || "someone" }}</span>
          <span class="display block text-2xl">peaked {{ entry.peakState.toLowerCase() }}</span>
          <span class="mono mt-1 block text-[11px]" style="color: var(--bone-2)">
            {{ entry.drinks }} poured · peak {{ entry.peakBAC.toFixed(3) }}%
          </span>
          <button type="button" class="save mono" @click="save(entry, i)">
            {{ saving === i ? "setting the glass…" : "save this window ↓" }}
          </button>
        </figcaption>
      </figure>
    </div>

    <p class="mono mt-10 text-center text-[11px]" style="color: var(--bone-3)">water before bed · the management thanks you</p>

    <div class="mt-6 flex justify-center">
      <button type="button" class="plate slab text-2xl" @click="store.dismissLastTab()"><span>start a new night</span></button>
    </div>
  </div>
</template>

<style scoped>
.keepsake {
  position: fixed;
  inset: 0;
  z-index: 50;
  overflow-y: auto;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(231, 184, 76, 0.12), transparent 60%),
    var(--nave);
  padding: max(1.6rem, env(safe-area-inset-top)) 1.4rem max(2.4rem, env(safe-area-inset-bottom));
  animation: sheet-in 400ms var(--ease-out) both;
}
.keepsake__windows {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  margin-top: 2rem;
}
.keepsake__figure {
  max-width: 420px;
  margin: 0 auto;
  width: 100%;
  animation: rise-in 600ms var(--ease-out) both;
}
.keepsake__figure figcaption {
  margin-top: 1rem;
}
.save {
  margin-top: 0.8rem;
  background: none;
  border: 0;
  padding: 0;
  color: var(--gold);
  font-size: 12px;
}
</style>
