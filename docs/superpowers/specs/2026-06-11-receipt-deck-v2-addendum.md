# Receipt Deck — v2 design addendum

**Date:** 2026-06-11
**Status:** Approved ("Yesss — this is it")
**Supersedes:** the visual/UX layer of `2026-06-10-doodled-tab-redesign-design.md`. The logic layer (session store, BAC/feelings utils, PWA, Vercel, tests) is unchanged and kept.

## Why

User feedback on v1: too web-y. Rounded "cards", a page header, grid-aligned typography, form-like inputs. The handwriting read as decoration, not as ink. v2 makes the receipt the *object*, not the theme.

## The model

- **The viewport is the bar table.** Dark wood (`#3A2E24`) with CSS grain (feTurbulence overlay, low opacity) and a canvas bubble field rising behind the paper. Bubble density/speed scale with the focused person's current BAC (sober ≈ a stray bubble; tipsy ≈ lively).
- **Each person is a full-screen receipt.** Classic paper `#FAFAF7`, thermal ink `#1C1C1A`, faded print `#8A8A82`, ballpoint blue `#2B3A8F`, red pen `#C92A1D`. Amber `#E8A33C` exists only behind the paper (table/bubbles). Torn edge at the bottom (clip-path zigzag), slight whole-paper rotation, drop shadow onto the table.
- **Swipe to flip people.** Pointer-driven card physics: paper follows the finger with rotation, flick past threshold advances to the next person's receipt (wraps around), otherwise springs back. Page dots + scribbled "swipe for <next> →" hint at the bottom. Swiping also works on desktop via drag.
- **The table (birds-eye).** A scribbled "the table" affordance (and tapping the page dots) zooms out: every active person's receipt lies scattered (seeded rotations/offsets), each showing name, big handwritten state word, tally strokes, printed BAC, red ⚠ + SLOW DOWN/CUT OFF when over the line, and the push pin if a vibe is pinned. A blank stub ("tear a new one +") adds a person. Tap a receipt to pick it up (returns to deck focused on them).

## Two voices only

Fraunces is dropped. **Thermal print** (Space Mono) for everything computed; **ballpoint** (Caveat) for everything human — including the big feeling line (`feeling: nicely tipsy`). No third voice.

## Scatter system (structural, not decorative)

- Every handwritten element gets a deterministic random transform from `src/utils/scatter.js`: seeded PRNG (string-hash → mulberry32) keyed by `sessionId:personId:elementKey`. Returns rotation (±1–4°), x/y offset (±2–8px). Stable across renders — ink that has dried, not ink that dances.
- Printed mono lines get small seeded x-drift (0–4px) like a real thermal printer.
- No two sibling elements share an angle. Numbers remain legible; scatter is on placement, not on glyphs (except write-on, below).

## Interactions

- **Add person:** the new receipt tears in (slide + settle). Identity is written *on the paper*: a hidden input drives a write-on render — each typed character appears as a Caveat glyph with its own seeded tilt/baseline shift. Prompted fields in sequence on the paper top: name, weight (kg), body constant (♂/♀ scribbled circle choice), ink color (tap one of 5 ink blots). Tap the identity line later to rewrite. No form chrome anywhere.
- **Pin the vibe:** the "hold it!!" note carries a literal red push-pin SVG stuck through the paper (drop-thunk animation + haptic on pin). Tapping the pin area opens a small torn paper scrap listing the three maintainable states (each line scattered); tapping pins/unpins.
- **Pour = game ability tiles.** One tile per drink (doodled icon: beer mug, wine glass, cocktail, shot + custom flask). Ready: green ink border, `POUR!` label. Cooling down: gray ink, conic-gradient radial sweep showing remaining fraction, mono countdown (`22m`). Tiles still always tappable (guidance, not enforcement) — pouring during cooldown gives a warning haptic. Tally strokes accumulate under each tile.
- **Stamp verdicts** stay (ON PACE / EASY NOW / SLOW DOWN / CUT OFF) as rotated rubber-stamp outlines printed on the paper; CUT OFF in red with pour timings suppressed (unchanged logic).
- **Close tab** is the last printed line of the receipt (`— — CLOSE TAB — —`), two-tap confirm; keepsake overlay restyled as a receipt on the table.

## Receipt anatomy (top → bottom)

1. Faint printed masthead: `EXPERIENCE ALCOHOL · TAB No. <n>` (centered, tiny)
2. Scribbled session nickname (editable, write-on), scattered
3. Scribbled identity: `<name> · 78kg ♂` (tap to rewrite)
4. `drinks:` + big tally strokes + count
5. Printed event lines (`21:02 BEER . . . +0.021`), custom drinks get a red margin scribble
6. Hand-drawn chart: rough multi-jitter ink line per person (focused person full ink, others faint), dashed forecast, red dashed target line, `you are here` in red Caveat; handwritten axis numbers
7. `feeling: <state>` huge Caveat + red scribble underline; `hold it!! next one ~11:20` note + push pin when pinned; stamp verdict
8. Ability tiles row
9. Printed small print: `estimates only · never a reason to drive` + CLOSE TAB line
10. Torn bottom edge; page dots + swipe hint below the paper (on the table)

## Components (v2 UI layer)

| Component | Job |
|---|---|
| `App.vue` | table bg, grain, BubbleField, view switch (deck ⇄ table), keepsake |
| `BubbleField.vue` | canvas particles, `intensity` prop from focused BAC |
| `ReceiptDeck.vue` | swipe physics, focus switching, dots + hint |
| `PersonReceipt.vue` | the full receipt anatomy above |
| `WriteOn.vue` | hidden input + per-char scattered Caveat render |
| `IdentityLine.vue` | name/weight/sex/ink write-on flow |
| `PourTiles.vue` | ability tiles + cooldown sweep + tallies |
| `RoughChart.vue` | hand-drawn multi-person chart |
| `PushPin.vue` | pin SVG + drop animation |
| `StampVerdict.vue` | kept, restyled (receipt grays/red) |
| `TableView.vue` | scattered mini receipts + add-stub |
| `CloseTab.vue` | kept, restyled keepsake |
| `src/utils/scatter.js` | seeded jitter (unit-tested) |

Removed from v1: TabHeader, PersonSlip, FeelingCard, PourRow, ReceiptLog, VibeChart, GlassMeter, SquiggleDivider (tear lines/dashes replace it).

## Technical notes

- DOM+SVG for all interactive content; canvas only for BubbleField. Grain via feTurbulence data-URI overlay. No html-in-canvas.
- Swipe: pointerdown/move/up on the receipt, `transform: translateX + rotate` tracking, threshold ~30% width or velocity flick; wrap-around order = active people order.
- Cooldown sweep: conic-gradient driven by a CSS custom property updated from `useLiveNow`.
- `prefers-reduced-motion`: bubbles static & sparse, no card spring, write-on appears instantly.
- Store/logic untouched except: no new store fields needed (view state is component-local). Tests: add scatter.js unit tests; existing 23 stay green.
