# Receipt pile v2.1 — fluid drag + margin notes + stickers (addendum)

**Date:** 2026-06-12
**Status:** Approved direction (interactive demo validated by user)
**Supersedes:** the deck/gesture sections of `2026-06-11-receipt-deck-v2-addendum.md` (embla deck, pull-down handler, internal scroll). Everything else in v2 (palette, receipt anatomy, scatter system, table view content, bubbles, grain) still stands unless amended below.

## Why

User feedback on the embla deck:

> "scroll bars make it look not great. doesn't feel like paper on top of table. as much as web ui." / "maybe 'swipe deck' is the mental model?" / reference: codepen YzXQeBe — "the drag here is so natural. like im holding the card." / "dragging/flicking up ought to 'throw' the receipts onto the table for that birds eye view."

Dissection of the codepen (Hammer.js tinder stack) — what makes it feel natural:

1. Card translates 1:1 with the pointer in **both axes** (`translate(deltaX, deltaY)`), not locked to a horizontal track.
2. It is a visible **pile**: cards behind peek out (`scale((20-i)/20) translateY(-30i px)`), and shuffle up when the top one leaves.
3. Release is a **throw**: `keep = |deltaX| < 80 || |velocityX| < 0.5`; otherwise the card flies out along the velocity vector with rotation.

## 1. Mental model

A pile of paper receipts on the bar table. The focused person's receipt is on top; the others peek out behind it, slightly askew. There is **no native scrolling anywhere** — the paper itself moves under your finger. No scrollbars can ever appear.

- Drag the paper anywhere; it follows 1:1 in both axes with slight rotation.
- Throw it sideways → it flies off and lands at the bottom of the pile; the next person's tab is on top.
- Fling it up past its end → it sails away from you, shrinking down onto the table = the birds-eye table view.
- Pull it down past its top → same destination, set down gently.
- Tap a scrap in the table view → pick that receipt back up.

## 2. ReceiptPile (replaces ReceiptDeck / embla)

`embla-carousel-vue` is **removed** from the project. `src/components/ReceiptDeck.vue` is replaced by `src/components/ReceiptPile.vue` built on raw pointer events.

### Stack layout

- All active people's receipts mounted, absolutely positioned, same top offset (~34px), width ~min(86vw, 340px). Order: focused person on top, then the rest in people order (rotated array).
- Depth transforms (seeded with `scatter`-style jitter per person id so each pile looks hand-stacked):
  - depth 0: `translateY(panY)` — the live card
  - depth 1: `translateY(-14px) scale(.97) rotate(~±2.3°)`
  - depth 2: `translateY(-26px) scale(.94) rotate(~±1.9°)`
  - depth ≥3: same transform as depth 2 (hidden behind it)
- Paper height = natural content height (receipts are proudly long). Torn-bottom clip-path stays.
- `touch-action: none` on the pile area; pointer capture on the top card; mouse and touch both work.

### Drag (move phase)

- `dx, dy` from pointer-down origin; transform = `translate(dx, panY + dy) rotate(clamp(dx · 0.05, ±14°))`.
- Vertical bounds: `panY ∈ [minPan, 0]` where `minPan = min(0, viewportH − paperH − topOffset)`. Beyond either bound, excess is rubber-banded ×0.55.
- Track velocity (px/ms) over the last move events.

### Release decision (pure function, unit-tested)

`decideRelease({dx, dy, vx, vy, panY, minPan, soloPerson})` → one of `throw-left | throw-right | to-table-up | to-table-down | settle`:

1. **Sideways throw** — `|dx| > 90 || |vx| > 0.55`: fly out along velocity vector, rotate ±24°, ~450ms ease-out; card moves to bottom of pile; focus advances. Direction-aware looping: throw **left → next** person, throw **right → previous**. If `soloPerson`, sideways always settles (with ×0.5 drag resistance so it feels weighted, not broken).
2. **Up-fling to table** — projected vertical landing `panY + dy + vy·260` overshoots `minPan` by >120px, or already at `minPan` and `vy < −0.5`: receipt animates up and **scales down toward its scrap position** in the table view; view switches to table. A receipt short enough to fit on screen (`minPan === 0`) therefore tosses on any decent up-flick — correct: nothing to scroll.
3. **Pull-down to table** — `panY === 0 && (dy > 80 || vy > 0.6)`: set down gently (downward exit), switch to table.
4. **Settle** — vertical momentum continues: `panY ← clamp(panY + dy + vy·260, minPan, 0)`, spring `cubic-bezier(.2,1.35,.4,1)` ~420ms. Horizontal returns to 0.

### Chrome

- Page dots (amber) and the "swipe for ‹name› →" hint stay at the bottom of the viewport (not on the paper). "the table ↓" scribble stays as tap fallback. All hidden-when-solo rules unchanged.
- Reduced motion: no fly-out/momentum animations; release applies end state instantly.

## 3. Margin-note handwriting (arrow labels)

The receipt **prints** facts (Space Mono, ink); a human **annotates** them in pen (Caveat). Captions like `drinks:` are dead — annotation arrows replace them.

New component `src/components/InkArrow.vue`: a small inline SVG — seeded hand-drawn quadratic curve + open arrowhead (control-point jitter from `scatter` seed), props: `seed`, `dir` (which way it hooks), `color` (default `var(--pen)`), sized by container. Paired with a Caveat label, scatter-rotated.

Applications (all labels Caveat, pen blue unless noted):

| Printed value (stands alone) | Annotation |
|---|---|
| Tally strokes | arrow + "drinks" |
| `62` (bare number, no unit) | arrow + "weight, kg" — tap number to edit, unchanged |
| ♂ / ♀ glyph | tiny arrow + "sex" |
| Chart red dot | arrow + "you are here" (redpen — exists, keep) |
| Chart forecast line | arrow + "drifting down" / "climbing" (faded) |
| Chart target line | "the vibe you're holding" (amber, no arrow needed) |
| Verdict stamp | arrow + "next pour — whenever you like" / "next pour — ~40 min" (replaces printed `next pour:` line) |

Color picker: the round trigger blot becomes a **scribble swatch in the top-right corner** of the paper (SVG zigzag patch in person color); tapping it expands a row of scribble swatches (same colors, same outside-tap dismiss).

## 4. Sticker pour strips (replaces .pour-tile)

Pour buttons become **sticky paper strips** stuck on the receipt — they don't share the paper's print language, they sit on top of it:

- `.sticker`: near-white `#FFFEF6` strip, torn-corner `clip-path` polygon, real small shadow (`0 2px 3px rgba(0,0,0,.22)` — stickers have physical height; this is an exception to print-flatness, like the pin), seeded rotation ±3°, ~58px wide.
- Ready: doodled drink icon + `POUR!` + drink name, green ink.
- Cooldown: grayscale ink, label `DRYING`, pencil-hatch overlay (`repeating-linear-gradient` 115°) that recedes right-to-left via `clip-path: inset()` driven by the existing `--cd` var. No conic sweep.
- "+ own" slip stays a dashed outline (it's the one *not yet stuck on*).
- **Pinned vibe = same sticker stock**: the pinned state chip becomes a sticker strip with the PushPin punched through its top edge. Pin menu interaction unchanged.

## 5. Table view transitions

- Throw-up: receipt visually recedes (translate up + scale ~0.3 + slight rotate) before the view swap; its scrap in TableView gets a brief settle-in (drop + tiny rotate). Approximate continuity is enough — no shared-element FLIP required for v2.1.
- Set-down (pull-down): deck translates down out of view, as currently.
- Pickup from table: receipt scales up from the scrap (existing `receipt-in` animation acceptable).

## 6. Testing

- `decideRelease` extracted as a pure util (`src/utils/pileGestures.js`) with vitest coverage: sideways thresholds, velocity-only throws, solo lock, up-fling overshoot (long + short paper), pull-down at top, momentum settle clamping.
- Existing 26 tests must stay green. Embla removed from package.json.

## Out of scope

Rooms/P2P (parked), any store or BAC-logic changes, PWA changes.
