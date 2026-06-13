# Receipt polish pass — v2.2 design

Date: 2026-06-13
Branch: `redesign/doodled-tab` (PR #2)
Supersedes the visual layer of: v2.1 receipt-pile addendum (gesture model
section here replaces v2.1's directional throw model). Logic/PWA sections of
v1 remain authoritative.

## Why

User feedback on the live doodled-tab build identified seven concrete problems:
the receipt has two competing ink colors instead of the person's chosen one;
the top section is congested with needless chrome ("EXPERIENCE ALCOHOL", a
"tonight" nickname) and its hand-drawn arrows drift because the fields share a
flex flow that reflows with name length; the pin-a-vibe affordance floats off
to the side as a big sticker instead of reading like a pin; the custom-drink
slip still looks like a web form; the bottom ledger's columns shift with drink-
name length; "left the bar" sits awkwardly inline; and the gesture model
overloads directions with different destinations.

Architecture decision (settled before design): **keep HTML + inline SVG.** The
arrows are "off" because of layout coupling, not rendering tech — a single
canvas overlay would break pile hit-testing, annotation a11y, and the seeded
SVG paths for no real gain. All fixes below stay in DOM + inline SVG.

## Scope (seven changes)

### A. One ink, chosen by the person

The receipt resolves to exactly two layers:

- **Machine print** — `--ink` / `--print` / `--faded`. Untouched. Covers
  timestamps, ml/%, the BAC reading, "est.", small print, ledger numbers.
- **The human's pen** — a single color, `person.color`. Every annotated mark
  adopts it: weight/drinks arrows, the "feeling" word, pour copy, the verdict
  stamp, drink stickers + "POUR!" label, the rough chart's "you are here" note
  + dot + trend line, the feeling underline, pins, "left the bar", the
  close-tab confirm line.

Red (`--redpen`) and green (`--greenink`) **retire as semantic colors** in the
receipt layer. Emphasis now comes from heavier handwriting, underlines, and
arrows — not hue. Danger/cut-off states are conveyed by copy and weight, all in
the one ink.

Implementation: set a scoped CSS custom property on the receipt root —
`--pen: <person.color>` — and replace per-element `style="color: var(--pen)"` /
`--redpen` / `--greenink` usages inside the receipt with `var(--pen)`. SVG
strokes that currently take `var(--redpen)` / `var(--greenink)` /
`person.color` props all resolve to the one chosen color. `--faded`, `--ink`,
`--print` stay as-is (printed layer). The amber table palette is outside the
receipt and unchanged.

Components touched: `PersonReceipt.vue`, `IdentityLine.vue`, `PourTiles.vue`,
`RoughChart.vue`, `StampVerdict.vue`, `InkArrow.vue` (default color),
`PushPin.vue`, `ColorScribble.vue` (already uses `person.color`).

### B. Free-flow top section (the arrow fix)

Remove:
- The masthead line `EXPERIENCE ALCOHOL · TAB No. NNN`.
- The "tonight" session nickname block (`WriteOn` + its scatter wrapper).

Rebuild the top as a **fixed-height relative zone** whose children are
**absolutely positioned at seeded coordinates** (via `scatter`), so no field
sits in a flex flow that reflows with text length:

- **Name** — largest, most prominent; anchored top-left with a small seeded
  offset/rotation. Width-capped so long names don't collide with the corner.
- **Sex glyph** — moves up to sit beside the color scribble near the top-right
  corner. Tap still toggles male/female.
- **Weight** — bare printed number, free-floating at a seeded position.
- **Arrows** — each annotation arrow + its handwritten label is positioned as a
  unit anchored to its own field's fixed box, so the arrow always points true.
  The weight arrow no longer depends on a `margin-left: 32%` against a flowing
  line.
- **Color scribble** — tucked tighter into the top-right corner (from
  `top-7 right-3` to roughly `top-2 right-2`).

Because every field has a stable box, name/weight length changes never move
another field or its arrow. The "tap a drink to start your tab" empty-state
hint keeps its place below the tally.

### C. Pin-a-vibe = a punched hole by the feeling

Replace the side-floating sticker strip with a small pin-hole mark **adjacent
to the "feeling" word**:

- **Unpinned:** a small punched-hole mark sits next to the feeling word;
  handwritten "pin a vibe?" with a little arrow points at the hole. Tapping the
  hole (or the text) opens the existing vibe menu.
- **Pinned:** a small `PushPin` sits *in* the hole; a short handwritten note
  ("hold tipsy") sits beside it. Tapping reopens the menu (which offers
  "unpin — free pour").

The vibe menu (torn-paper scrap listing maintainable states) is unchanged in
behavior; only the trigger affordance changes. Pin and note use `var(--pen)`.

### D. Custom drink, de-formed

In `PourTiles.vue`'s custom slip:
- Drop the redundant printed `name it` caption; keep only the handwritten
  `WriteOn` with placeholder "name it…".
- Replace the two `<input type="number">` underline fields with pen-written
  values labeled by **tiny handwritten unit hints** (`%`, `oz`) instead of the
  "abv %" / "oz" printed captions — consistent with the design rule that
  handwriting labels values, never form captions.
- Keep the "HOUSE SPECIAL" header and the "ADD IT" stamp button.

Editing mechanism for the numbers: reuse the inline-edit pattern already used
for weight in `IdentityLine.vue` (tap a bare value → focused numeric input →
commit on blur/enter), so values read as written-on, not as a form field. The
`1 oz ≈ 30 ml` helper line stays as a small handwritten note.

### E. Ledger columns that hold still

Switch each ledger `<li>` from `flex` to a **fixed-track CSS grid**:

```
time | drink | ml | % | +Δ
```

- Each datum gets a stable column track; numbers and the delta keep the same
  x-position down the receipt regardless of drink-name length.
- Long custom names truncate within the `drink` track (ellipsis).
- Keep the dotted leader between `%` and `+Δ` as a receipt flourish if it fits
  the grid; otherwise drop it in favor of clean column alignment.
- The "house special" marker for custom drinks stays, rendered in `var(--pen)`.

### F. Footer

- Move the **"left the bar"** action out of the identity line and down beside
  the "— — CLOSE TAB — —" line in the footer. Only shown when 2+ people are
  active (you cannot deactivate the last person); hidden solo, same as today.
- Update the bottom-chrome hint copy in `ReceiptPile.vue` to teach the new
  gestures: flick = flip through receipts, pinch = the table. Keep a tappable
  table affordance for accessibility.

### G. Gesture model (`ReceiptPile.vue` + `pileGestures.js` + tests)

New model, replacing v2.1's directional destinations:

- **Any sufficient throw/drag, any direction → advance to the next receipt**
  (wraps around the pile). Direction no longer selects next-vs-previous; every
  qualifying release advances forward. Below-threshold releases spring back.
- **Pinch (two-pointer zoom-out) → toss to the table.** No directional throw
  reaches the table anymore.

`decideRelease` (pure, tested) simplifies: drop the `throw-left` /
`throw-right` / `to-table-up` / `to-table-down` distinctions; a qualifying
release returns a single `next` action, otherwise `settle` with a clamped
`panY`. Pinch is detected in the component (not in `decideRelease`) via
two-pointer distance tracking; crossing a shrink threshold triggers the
existing `tossToTable` path.

Tests: update `pileGestures.test.js` to the new contract (any qualifying
throw → `next`; sub-threshold → `settle`). Remove assertions for the retired
directional/table outcomes. Pinch is a component interaction; cover the pure
threshold helper if one is extracted, otherwise verify manually in preview.

## Out of scope

- Canvas overlay rewrite (explicitly rejected).
- Any change to BAC math, feelings, the store/event model, or PWA shell.
- Multi-device rooms (parked post-v1).
- The amber table view / `TableView.vue` visuals beyond the gesture entry.

## Verification

- `bunx vitest run` green (updated pile-gesture tests + existing 36-test
  baseline adjusted for the new contract).
- Live preview (port 5174): pick each ink color and confirm every pen mark
  follows; type a long name and confirm no arrow drifts; pin/unpin a vibe;
  add a custom drink without form chrome; scan the ledger for column
  alignment; flick in several directions (always advances); pinch to reach the
  table; "left the bar" appears only with 2+ people and sits by Close Tab.
</content>
</invoke>
