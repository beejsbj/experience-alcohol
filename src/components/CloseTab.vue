<script setup>
import { computed } from "vue";
import { useSessionStore } from "../stores/session";
import { triggerHaptic } from "../utils/haptics";
import { clock, tabNumbers } from "../utils/receipt";
import ReceiptPaper from "./ReceiptPaper.vue";
import Barcode from "./Barcode.vue";

// The last receipt of the night: printed line by line, then PAID gets
// slammed across it. Yours to keep.
const store = useSessionStore();

const tab = computed(() => store.lastTab);

const duration = computed(() => {
  if (!tab.value) return "";
  const ms = new Date(tab.value.closedAt) - new Date(tab.value.startedAt);
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  return hours ? `${hours}H ${String(minutes).padStart(2, "0")}M` : `${minutes}M`;
});

const numbers = computed(() => tabNumbers(tab.value?.startedAt ?? "closed"));
const totalPours = computed(() => tab.value?.summary.reduce((s, e) => s + e.drinks, 0) ?? 0);

// Each printed line feeds out a beat after the last.
const line = (i) => ({ animation: `print-line 380ms steps(10) ${(i * 90).toFixed(0)}ms both` });

const fresh = () => {
  store.dismissLastTab();
  triggerHaptic("success");
};
</script>

<template>
  <div v-if="tab" class="keepsake flex-col py-10" role="dialog" aria-label="Closed tab summary">
    <div class="relative w-full" style="max-width: 330px; transform: rotate(-1.5deg); animation: receipt-in 380ms ease-out both">
      <ReceiptPaper seed="keepsake" :teeth="30">
        <div class="px-6 pb-8 pt-8 text-center">
          <p class="dots text-[26px]" style="letter-spacing: 0.06em" :style="line(0)">EXPERIENCE</p>
          <p class="print mt-1 text-[9px] font-bold" style="letter-spacing: 0.6em; padding-left: 0.6em" :style="line(1)">ALCOHOL</p>

          <div class="rule mt-3" :style="line(2)"></div>
          <p class="print mt-2 text-[11px] font-bold" style="letter-spacing: 0.4em" :style="line(3)">TAB CLOSED</p>
          <div class="print mt-2 flex justify-between text-[9.5px]" style="letter-spacing: 0.08em" :style="line(4)">
            <span>TAB №{{ numbers.tab }}</span>
            <span>{{ clock(tab.startedAt) }}–{{ clock(tab.closedAt) }}</span>
            <span>{{ duration }}</span>
          </div>
          <div class="rule--double mt-2" :style="line(5)"></div>

          <p v-if="!tab.summary.length" class="print mt-4 text-[10px]" style="letter-spacing: 0.2em; color: var(--print-soft)" :style="line(6)">
            A QUIET ONE — NOTHING POURED
          </p>

          <div
            v-for="(entry, i) in tab.summary"
            :key="i"
            class="mt-3 text-left"
            :style="line(6 + i)"
          >
            <div class="print flex items-baseline justify-between text-[11px]">
              <span class="font-bold" style="letter-spacing: 0.2em">{{ (entry.name || "guest").toUpperCase() }}</span>
              <span>{{ entry.drinks }} POUR{{ entry.drinks === 1 ? "" : "S" }}</span>
            </div>
            <div class="print mt-0.5 flex items-baseline justify-between text-[9.5px]" style="color: var(--print-soft)">
              <span>PEAK EST.</span>
              <span>{{ entry.peakBAC.toFixed(3) }}%</span>
            </div>
            <p class="pen mt-0.5 text-[20px]" style="color: #2b3a8f">peaked {{ entry.peakState.toLowerCase() }}</p>
          </div>

          <div class="rule mt-4" :style="line(7 + tab.summary.length)"></div>
          <div class="print mt-2 flex items-baseline justify-between text-[11px]" :style="line(8 + tab.summary.length)">
            <span class="font-bold" style="letter-spacing: 0.3em">TOTAL</span>
            <span class="dots text-[26px]">{{ totalPours }}</span>
          </div>
          <div class="rule--double mt-2" :style="line(9 + tab.summary.length)"></div>

          <div class="mt-4" :style="line(10 + tab.summary.length)">
            <Barcode :seed="`keepsake:${tab.closedAt}`" :height="26" />
          </div>
          <p class="print mt-3 text-[8.5px] leading-[1.7]" style="letter-spacing: 0.16em; color: var(--print-soft)" :style="line(11 + tab.summary.length)">
            WATER BEFORE BED<br />
            THE MANAGEMENT THANKS YOU
          </p>
        </div>

        <!-- slammed on once the printing stops -->
        <span
          class="stamp pointer-events-none absolute left-1/2 top-[38%] text-[34px]"
          style="color: #b3261e; --tilt: -14deg; margin-left: -80px; letter-spacing: 0.2em; padding: 8px 18px 6px 22px"
          :style="{ animation: `stamp-thump 420ms cubic-bezier(.3,1.4,.5,1) ${(12 + tab.summary.length) * 90 + 200}ms both` }"
        >PAID</span>
      </ReceiptPaper>
    </div>

    <button
      type="button"
      class="pen mt-8 text-[30px]"
      style="color: var(--amber); -webkit-text-stroke: 0.3px currentColor"
      @click="fresh"
    >
      start a fresh tab →
    </button>
  </div>
</template>
