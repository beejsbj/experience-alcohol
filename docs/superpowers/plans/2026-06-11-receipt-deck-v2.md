# Receipt Deck v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Rebuild the UI layer as the receipt-deck v2 per `docs/superpowers/specs/2026-06-11-receipt-deck-v2-addendum.md` — full-screen swipeable receipts on a grained bar table with canvas bubbles, scattered handwriting, write-on identity, push-pin vibes, game-style pour tiles, and a birds-eye table view.

**Keep untouched:** `src/stores/session.js`, `src/utils/bac.js`, `src/utils/feelings.js`, `src/utils/haptics.js`, `src/composables/useLiveNow.js`, all existing tests (23), PWA config, vercel.json. Logic layer is done.

**Environment:** branch `redesign/doodled-tab`; prefix `bun` commands with `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && `; Bun only.

**Taste guardrails (every UI task):**
- Two fonts only: Space Mono (printed) and Caveat (ballpoint). Remove all Fraunces imports/uses.
- No rounded "card" containers. Paper is rectangular with a torn bottom edge. Max border-radius anywhere else: 8px (pour tiles), 50% (ink blots/bubbles/pin head).
- Every handwritten element placed with `scatter()` — never grid-aligned, never the same angle as a sibling.
- Printed mono lines get seeded x-drift 0–4px.
- Amber appears ONLY behind the paper (table, bubbles) — never as paper/ink tint.
- All animation behind `prefers-reduced-motion` guard (CSS already blankets it; JS animations must check `matchMedia`).

---

### Task V2-1: Scatter util (TDD) + v2 design tokens/CSS

**Files:** Create `src/utils/scatter.js`, `tests/scatter.spec.js`. Rewrite `src/assets/main.css`. Modify `src/main.js` (drop Fraunces imports). Remove `@fontsource/fraunces` dep.

- [ ] **Step 1: failing tests** — `tests/scatter.spec.js`:

```js
import { describe, expect, it } from "vitest";
import { scatter, scatterRand } from "../src/utils/scatter";

describe("scatter", () => {
  it("is deterministic for the same seed", () => {
    expect(scatter("s1:p1:name")).toEqual(scatter("s1:p1:name"));
  });

  it("differs between seeds", () => {
    expect(scatter("s1:p1:name").transform).not.toBe(scatter("s1:p2:name").transform);
  });

  it("respects bounds", () => {
    for (let i = 0; i < 50; i += 1) {
      const rand = scatterRand(`seed-${i}`);
      const value = rand();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    const { transform } = scatter("bounds-check", { r: 3, x: 5, y: 4 });
    const [, dx, dy, rot] = transform.match(
      /translate\((-?[\d.]+)px, (-?[\d.]+)px\) rotate\((-?[\d.]+)deg\)/
    );
    expect(Math.abs(Number(dx))).toBeLessThanOrEqual(5);
    expect(Math.abs(Number(dy))).toBeLessThanOrEqual(4);
    expect(Math.abs(Number(rot))).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: red** — run suite, expect module-not-found.
- [ ] **Step 3: implement `src/utils/scatter.js`:**

```js
// Deterministic "dried ink" jitter — seeded so layout never dances between renders.

function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function scatterRand(seed) {
  return mulberry32(hashSeed(String(seed)));
}

/**
 * Seeded scatter transform. r = max |rotation| deg, x/y = max |offset| px.
 */
export function scatter(seed, { r = 2.5, x = 4, y = 3 } = {}) {
  const rand = scatterRand(seed);
  const rot = (rand() * 2 - 1) * r;
  const dx = (rand() * 2 - 1) * x;
  const dy = (rand() * 2 - 1) * y;
  return {
    transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`,
  };
}
```

- [ ] **Step 4: green, commit** `feat: seeded scatter util`
- [ ] **Step 5: rewrite `src/assets/main.css`** — replace v1 tokens/components wholesale:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --table: #3a2e24;
  --paper: #fafaf7;
  --paper-shade: #efefea;
  --ink: #1c1c1a;
  --print: #3a3a35;
  --faded: #8a8a82;
  --pen: #2b3a8f;
  --redpen: #c92a1d;
  --greenink: #1c8a3c;
  --amber: #e8a33c;
}

@layer base {
  html,
  body {
    height: 100%;
    overscroll-behavior: none;
  }

  body {
    background: var(--table);
    color: var(--ink);
    font-family: "Space Mono", monospace;
    -webkit-tap-highlight-color: transparent;
    overflow: hidden;
  }

  body::after {
    content: "";
    position: fixed;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    opacity: 0.08;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
  }

  button {
    touch-action: manipulation;
  }
}

@layer components {
  .print {
    font-family: "Space Mono", monospace;
  }

  .scribble {
    font-family: "Caveat", cursive;
  }

  .receipt-paper {
    position: relative;
    background: var(--paper);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    clip-path: polygon(
      0 0, 100% 0, 100% calc(100% - 9px),
      96% 100%, 90% calc(100% - 8px), 84% 100%, 78% calc(100% - 9px),
      72% 100%, 66% calc(100% - 7px), 60% 100%, 54% calc(100% - 9px),
      48% 100%, 42% calc(100% - 8px), 36% 100%, 30% calc(100% - 9px),
      24% 100%, 18% calc(100% - 7px), 12% 100%, 6% calc(100% - 9px), 0 100%
    );
  }

  .masthead {
    font-size: 0.5rem;
    letter-spacing: 0.2em;
    text-align: center;
    color: var(--faded);
  }

  .stamp {
    display: inline-block;
    border: 2.5px solid currentColor;
    border-radius: 4px 6px 3px 7px / 6px 3px 7px 4px;
    padding: 1px 8px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.12em;
  }

  .pour-tile {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 100%;
    aspect-ratio: 1;
    border: 2.5px solid var(--faded);
    border-radius: 6px;
    background: var(--paper-shade);
    color: #55554f;
    transition: transform 120ms ease;
  }

  .pour-tile:active {
    transform: scale(0.92);
  }

  .pour-tile--ready {
    border-color: var(--greenink);
    background: #eaf7ee;
    color: var(--greenink);
  }

  .pour-tile__sweep {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: conic-gradient(
      rgba(60, 60, 55, 0.26) calc(var(--cd, 0) * 1turn),
      transparent 0
    );
  }

  .pour-tile__label {
    font-family: "Space Mono", monospace;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.06em;
  }

  .ink-blot {
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
    border: 2px solid transparent;
  }

  .ink-blot--active {
    border-color: var(--ink);
  }

  .write-on-char {
    display: inline-block;
    animation: char-in 90ms ease-out both;
  }

  .keepsake {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(20, 14, 8, 0.55);
    padding: 1.2rem;
  }

  .page-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(232, 163, 60, 0.35);
  }

  .page-dot--active {
    background: var(--amber);
  }
}

@keyframes char-in {
  from {
    opacity: 0;
    transform: translateY(3px) rotate(3deg) scale(1.3);
  }
}

@keyframes pin-drop {
  0% {
    transform: translateY(-18px) scale(1.4);
    opacity: 0;
  }
  60% {
    transform: translateY(1px) scale(0.96);
    opacity: 1;
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes receipt-in {
  from {
    transform: translateY(40px) rotate(4deg);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 6:** `src/main.js`: delete the two Fraunces import lines. Run `bun remove @fontsource/fraunces`.
- [ ] **Step 7:** tests green (25 = 23 + 2? scatter adds 3 → 26 total; verify build clean). Commit `feat: v2 receipt tokens — table, grain, paper, tiles`.

*(Old v1 components now reference missing classes; they're deleted in V2-3. Build must still compile.)*

---

### Task V2-2: Foundation components

**Files:** Create `src/components/BubbleField.vue`, `src/components/PushPin.vue`, `src/components/WriteOn.vue`. Rewrite `src/components/StampVerdict.vue`.

- [ ] **Step 1: `BubbleField.vue`** — fixed full-viewport canvas behind everything:

```vue
<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({
  intensity: { type: Number, default: 0 }, // 0..1
});

const canvasRef = ref(null);
let ctx = null;
let raf = 0;
let bubbles = [];
let lastTime = 0;

const reduced = typeof matchMedia !== "undefined" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const targetCount = () => Math.round(4 + props.intensity * 26);

const spawn = (height, width, atBottom = true) => ({
  x: Math.random() * width,
  y: atBottom ? height + 20 : Math.random() * height,
  r: 3 + Math.random() * 11,
  v: (18 + Math.random() * 30) * (0.6 + props.intensity),
  a: 0.12 + Math.random() * 0.22,
});

const resize = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
};

const tick = (time) => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dt = Math.min(0.05, (time - lastTime) / 1000 || 0.016);
  lastTime = time;

  while (bubbles.length < targetCount()) bubbles.push(spawn(height, width, bubbles.length > 4));
  if (bubbles.length > targetCount()) bubbles.length = targetCount();

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(232, 163, 60, 0.5)";
  for (const bubble of bubbles) {
    bubble.y -= bubble.v * dt;
    bubble.x += Math.sin(time / 900 + bubble.r) * 0.2;
    if (bubble.y < -20) Object.assign(bubble, spawn(height, width));
    ctx.globalAlpha = bubble.a;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (!reduced) raf = requestAnimationFrame(tick);
};

onMounted(() => {
  ctx = canvasRef.value.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(raf);
  window.removeEventListener("resize", resize);
});

watch(() => props.intensity, () => { /* count adjusts in tick */ });
</script>

<template>
  <canvas ref="canvasRef" class="fixed inset-0" aria-hidden="true"></canvas>
</template>
```

- [ ] **Step 2: `PushPin.vue`** — red pin, optional drop animation on mount:

```vue
<script setup>
defineProps({ animate: { type: Boolean, default: true } });
</script>

<template>
  <svg
    width="22"
    height="26"
    viewBox="0 0 22 26"
    aria-hidden="true"
    :style="animate ? 'animation: pin-drop 320ms cubic-bezier(0.3, 1.4, 0.5, 1) both' : ''"
  >
    <rect x="10" y="12" width="2.2" height="11" rx="1" fill="#8a1c13" transform="rotate(6 11 12)" />
    <circle cx="11" cy="7" r="6" fill="var(--redpen)" />
    <circle cx="9" cy="5" r="2" fill="#e8766b" />
  </svg>
</template>
```

- [ ] **Step 3: `WriteOn.vue`** — text rendered as per-char scattered ballpoint glyphs; editable via hidden input:

```vue
<script setup>
import { computed, ref } from "vue";
import { scatterRand } from "../utils/scatter";

const props = defineProps({
  modelValue: { type: String, default: "" },
  seed: { type: String, required: true },
  placeholder: { type: String, default: "write here…" },
  editable: { type: Boolean, default: true },
  color: { type: String, default: "var(--pen)" },
});
const emit = defineEmits(["update:modelValue", "done"]);

const inputRef = ref(null);
const focused = ref(false);

const chars = computed(() => {
  const rand = scatterRand(props.seed + props.modelValue.length);
  return [...props.modelValue].map((char, index) => {
    const randChar = scatterRand(`${props.seed}:${index}:${char}`);
    return {
      char: char === " " ? " " : char,
      style: {
        transform: `rotate(${((randChar() * 2 - 1) * 5).toFixed(1)}deg) translateY(${((randChar() * 2 - 1) * 2).toFixed(1)}px)`,
        color: props.color,
      },
    };
  });
});

const focusInput = () => {
  if (props.editable) inputRef.value?.focus();
};
</script>

<template>
  <span class="relative inline-block" @click="focusInput">
    <span class="scribble" :class="{ 'cursor-text': editable }">
      <span
        v-for="(entry, index) in chars"
        :key="index"
        class="write-on-char"
        :style="entry.style"
      >{{ entry.char }}</span>
      <span v-if="!modelValue && !focused" class="scribble" style="color: var(--faded)">{{ placeholder }}</span>
      <span
        v-if="focused"
        style="display:inline-block;width:2px;height:1em;background:var(--pen);vertical-align:-2px;animation:none"
      ></span>
    </span>
    <input
      v-if="editable"
      ref="inputRef"
      :value="modelValue"
      class="absolute inset-0 opacity-0"
      style="font-size: 16px"
      @input="emit('update:modelValue', $event.target.value)"
      @focus="focused = true"
      @blur="focused = false; emit('done')"
      @keydown.enter="inputRef.blur()"
    />
  </span>
</template>
```

- [ ] **Step 4: rewrite `StampVerdict.vue`** — same API (`verdict` prop, thump Transition), v2 tones: CUT OFF + SLOW DOWN `var(--redpen)`, EASY NOW `#8a6d1c`, ON PACE `var(--greenink)`; tilt via `scatter(verdict, { r: 4, x: 0, y: 0 })` inline style instead of tilt classes.
- [ ] **Step 5:** build clean, tests green, commit `feat: v2 foundation — bubbles, pin, write-on, stamps`.

---

### Task V2-3: The receipt itself + deck + table + app swap

**Files:** Create `src/components/PourTiles.vue`, `src/components/RoughChart.vue`, `src/components/IdentityLine.vue`, `src/components/PersonReceipt.vue`, `src/components/ReceiptDeck.vue`, `src/components/TableView.vue`. Rewrite `src/components/CloseTab.vue` styles + `src/App.vue`. Delete `TabHeader.vue`, `PersonSlip.vue`, `FeelingCard.vue`, `PourRow.vue`, `ReceiptLog.vue`, `VibeChart.vue`, `GlassMeter.vue`, `SquiggleDivider.vue`, `TallyMarks.vue` (tally rendering moves into a shared `TallyStrokes.vue` — create it, looser jitter via scatterRand).

Follow the receipt anatomy in the addendum §"Receipt anatomy" exactly, and the taste guardrails. Key mechanics:

**PourTiles:** drinks = DRINKS + customDrinks. Per drink: `nextPourMinutes` → ready (`POUR!`, green, doodle icon stroke `currentColor`) or cooldown (`--cd` = remaining/total fraction where total = the wait when it started — simpler: `--cd = min(1, minutes/90)`, label `Xm`/`Xh`). Tap always logs (warning haptic when on cooldown). Doodled SVG icons inline per type (mug, wine glass, martini, shot glass; flask for customs). `+ own` is a 5th dashed tile opening a paper scrap (WriteOn fields: name, abv %, oz). TallyStrokes under each tile.

**RoughChart (replaces VibeChart):** same data math as the deleted VibeChart (sample past per active person, `projectBAC` 2h dashed forecast, red dashed target of focused person), but hand-drawn: jitter every sampled y by `scatterRand` (±1.5px), stroke `var(--pen)` for focused person and their `person.color` for others at 0.35 opacity, axis labels in Caveat (`0.04 / 0.08 / 0.12`), `you are here` red Caveat near the now-point.

**IdentityLine:** `<name> · <weight>kg <♂|♀>` — WriteOn for name; tapping weight cycles edit mode (WriteOn numeric); sex is a tap-toggle scribbled circle; ink color = 5 ink-blot dots (PERSON_COLORS). All on one scattered line near the receipt top. "left the bar" tiny red scribble at far right (deactivate, only when >1 active).

**PersonReceipt(props: person, isNew):** full anatomy: masthead `EXPERIENCE ALCOHOL · TAB No. <person.id padded>`; nickname WriteOn (`store.session.nickname`, shared across receipts); IdentityLine; `drinks:` + TallyStrokes(total) + count; printed event lines for THIS person only (their receipt) with seeded x-drift, custom drinks get red scribble note; RoughChart (all people, this one focused); feeling block — `feeling: <state lowercase>` huge Caveat + red underline SVG; when pinned: `hold it!! next one ~<time>` red scribble + PushPin, else `pin a vibe?` faint scribble; tapping the area opens torn paper scrap menu (MAINTAINABLE_STATES via WriteOn-style lines, + unpin); StampVerdict + pourCopy printed line (reuse v1 FeelingCard logic verbatim for bac/stamp/pourCopy/cutoff); PourTiles; small print + `— — CLOSE TAB — —` printed line (two-tap confirm inline: first tap turns it red `SURE? TAP AGAIN`); torn bottom edge via `.receipt-paper`. Whole paper gets `scatter('paper:' + person.id, { r: 1.2, x: 3, y: 0 })`.

**ReceiptDeck:** renders focused person's PersonReceipt full-screen (scrollable vertically inside paper when content overflows: paper is `max-height: calc(100dvh - 90px)`, `overflow-y: auto`). Pointer swipe: track dx on pointerdown/move; paper style `translateX(dx) rotate(dx * 0.04deg)`; release: if `|dx| > window.innerWidth * 0.3` or velocity > 0.5px/ms → animate out (transition 220ms), `store.setFocus(next)`, slide new in from the other side (receipt-in animation); else spring back. Order = activePeople; wraps. Below paper: page dots (active = focused) + `swipe for <next name> →` scribble in table-ink + `the table ↓` scribble button → emits `table`. Vertical scrolling inside paper must not break horizontal swipe: only treat as swipe when |dx| > |dy| * 1.5 from the start; otherwise let the scroll happen.

**TableView:** dark table full-screen; scribbled `the table · <time>` heading; one mini receipt per active person — paper scraps (no torn edge needed, small `.receipt-paper`-lite) scattered via `scatter('table:' + person.id, { r: 4, x: 14, y: 8 })`, stacked vertically with negative margins and varied left offsets like the mockup; each shows: name (pen, person.color ink), state word big Caveat, TallyStrokes + count, printed BAC, PushPin if pinned, red `⚠ SLOW DOWN`/`CUT OFF` print line when stamp is warning-level. Plus a blank stub: dashed-outline paper scrap `tear a new one +` → `store.addPerson({})` then emit `pickup` (deck shows the new receipt, name empty → WriteOn placeholder "who's this?"). Tap mini receipt → `store.setFocus(id)` + emit `pickup`.

**App.vue:** table bg + BubbleField (intensity = focused person BAC mapped `min(1, bac / 0.12)`) + view state `ref<'deck'|'table'>` + ReceiptDeck/TableView + CloseTab keepsake (restyled: paper scrap on table, mono+caveat only). No header, no max-width column, no footer outside the paper.

- [ ] Build after each component; delete old components with `git rm`; grep for stale imports (`FeelingCard|PourRow|ReceiptLog|VibeChart|GlassMeter|SquiggleDivider|TallyMarks|TabHeader|PersonSlip`) → zero hits; tests green (26); commit per logical chunk (`feat: pour tiles + rough chart`, `feat: person receipt`, `feat: receipt deck + table view + v2 app shell`).

---

### Task V2-4: Visual verification + polish (orchestrator, in browser)

Walkthrough at 375×812: deck renders; swipe flips people (and springs back on small drags); table view scatter + pickup; add person via stub → write-on name; pin vibe → pin drop; pour tiles cooldown sweep ticking; receipt scroll vs swipe doesn't conflict; close tab keepsake; reload persistence; zero console errors. Art-direct spacing/scatter amplitudes by eye. Then `bunx vercel deploy --prod --yes`, update PR description, report to user.
