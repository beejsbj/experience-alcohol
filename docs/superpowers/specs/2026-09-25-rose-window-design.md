# The Rose Window — a fresh visual design and UX

**Date:** 2026-09-25
**Status:** In progress on `redesign/rose-window`. Burooj asked for "a completely
fresh visual design/UX … using my project and visual ideas as a seed."
**Replaces:** the receipt UI entirely. Stores, BAC maths, feelings, and rooms are
untouched and still authoritative.

## Seeds kept

- *Maintain* is the heart: pin the vibe you want to hold; the app shows where
  you are against it and when the next pour keeps you there.
- The night as an artifact and keepsake; the social table; the P2P room.
- Physical objects that follow the finger; seeded, structural randomness
  (`scatter.js`); warm, funny, honest harm reduction ("never a reason to drive").

## Taste read (from Brain/attachments/visual-inspo, 55 images sampled)

Stained glass and circular medallions are the most repeated motif (rose
windows, Kingdom Hearts glass). Then Persona 5's black/white/blood-red UI,
angular type and tilted plates; type as image (Dune covers); radial
sunbursts; bimodal composition (one huge element, or dense collage); jewel
palettes. Handwriting is rarely a primary voice.

## Concept

Each person's night is a **backlit stained-glass rose window** in a dark nave.

- **The window is a 12-hour clock of the night.** 24 half-hour wedges ×
  6 feeling rings (evenly spaced, one ring per feeling from "barely
  noticeable" to "feeling confident"; the edge is where "overconfident"
  begins). It is always full of dim, seeded, coloured glass: the window is
  made; **the night lights it.**
- From the first pour to now, each wedge lights up as far out as BAC reached,
  in the jewel colour of the last drink poured: beer gold `#E7B84C`, wine
  ruby `#B5222B`, cocktail violet `#7B3A8C`, shot ice `#BFEAF2`, anything
  else emerald `#1F8A66`.
- **Pinned vibe** is a gold halo ring. The **forecast** is a dashed line of
  glass not yet made. Each **pour** is a jewel set in the rim at its time.
  Roman numerals mark the hours; a bone hand points to now, with a pulsing
  "you are here" jewel.
- **The hub** is a quatrefoil lit in your current drink's colour.
- The light behind the window takes the colour of what you're drinking,
  stronger as BAC rises.

## Voices

| Voice | Font | For |
|---|---|---|
| The night announces | Bodoni Moda (variable, italic, opsz 96) | the feeling word, huge, as image; vibe names |
| The bar warns | Anton, caps, on tilted Persona "plates" | names, verdicts (ON PACE gold, EASY NOW bone, SLOW DOWN / CUT OFF blood), buttons |
| The maths whispers | JetBrains Mono, small | BAC estimate, next pour, fine print |

Palette tokens live in `src/assets/main.css` (`--nave`, `--stone`, `--lead`,
`--bone`, `--gold`, `--blood`, `--ice`). `.plate` / `.plate--dark|blood|gold`
is the Persona label; `.sheet` is the full-screen overlay with a blood slash.

## Screens

- **Night view** (`NightView.vue`): a name plate (tap → person menu), roundels
  of everyone's mini windows plus `+` and TABLE; the window (swipe sideways to
  change person); the feeling word (tap → vibe sheet); the verdict plate and
  next-pour line; the pour row.
- **Pour row** (`PourRow.vue`): gothic **lancet** windows of each drink's glass.
  Tap to pour; a glass drop flies into the window. A lancet that would
  overshoot the vibe dims and shows the wait, but still pours. `other` opens
  `CustomDrinkSheet`.
- **Vibe sheet**: "HOLD ME AT", three Bodoni options, "let it drift".
- **Person menu** (`PersonMenu.vue`, Persona-style): name, weight, body
  (for the maths), left the bar, close the tab (two taps), done.
- **Table** (`TableWall.vue`): "THE TABLE" in huge Anton; a staggered
  2-column wall of mini windows; the room invite; "which one's you?" seat
  claiming; seat marks.
- **Room** (`RoomMedallion.vue`): the QR set in a stone-and-gold medallion,
  the code, "send the link", peer count, leave.
- **Keepsake** (`Keepsake.vue`): "THE NIGHT, IN GLASS": each person's
  finished window, with a PNG export (share sheet or download).
  `closeTab()` now keeps `person` and `events` in `lastTab.summary` so the
  windows can be redrawn.

## Pure modules (tested)

- `src/utils/dial.js`: clock-face geometry (`angleAt`, `bandPath`,
  `linePath`, `ringSpot`).
- `src/utils/window.js`: `windowModel`, `feelingScale`, `traceryCells`,
  `paneBands`, `GLASS`.
