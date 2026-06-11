# The Doodled Tab — v1 redesign, PWA, and ship

**Date:** 2026-06-10
**Status:** Approved direction, pending spec review
**Scope:** Full visual redesign + UX polish + installable PWA + deploy. No backend. Rooms are explicitly out of scope (parked for v2 as decentralized P2P — see "Future: rooms").

## 1. Product intent

A mobile-first live drink tracker for a night out with friends. One phone tracks one or more people; each tap logs a drink, and the app continuously estimates BAC (Widmark) and translates it into *feeling states* ("Pleasantly Relaxed", "Definitely Tipsy").

**The heart of the app is maintain:** you pin the vibe you want to hold tonight, and the app tells you where you are relative to it and when the next pour keeps you there. Everything in the UI orients around "where you are vs. where you want to be."

Tone: warm, funny, honest harm-reduction. Never moralizing, never a cop. Hard line: never frames anything as "safe to drive."

## 2. Visual identity — "the tab you doodled on"

The whole interface is one artifact: a bar receipt that you, slightly tipsy, have been doodling on all night. Three voices share the page:

| Voice | Font | Used for |
|---|---|---|
| The bar prints | Space Mono | times, BAC numbers, line items, stamps, labels — everything *computed* |
| The night announces | Fraunces (italic, 500/700) | the big feeling words, headings, drink button labels |
| You scribble | Caveat (500/700) | annotations, tallies, "hold here!", warnings in red pen, session nickname |

**Rule of voices:** precise things speak mono; emotional things speak italic serif; personal things speak handwriting. No element mixes voices.

### Palette

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#FFF7EC` | app background (warm cream) |
| `--card` | `#FFFDF7` | receipt/card surfaces |
| `--ink` | `#2A1B10` | primary text, drawn borders |
| `--amber` | `#E8A33C` | liquid fill, primary accent, "me" avatar |
| `--burnt` | `#C7521F` | stamps, secondary accent, eyebrow labels |
| `--pen` | `#2B3A8F` | ballpoint blue — tallies, neutral doodles |
| `--redpen` | `#C92A1D` | red pen — target line, warnings, "hold here!" |
| `--faded` | `#9A7B54` | muted printed text |
| `--stain` | `rgba(232,163,60,0.18)` | coaster-ring ambient texture |

Light theme only in v1 (paper doesn't have a dark mode; a "closing time" dark theme is a parked idea).

### Wobble system (user explicitly asked: "more wobbly and uneven")

Nothing sits perfectly straight; nothing is a perfect rectangle. Implemented deterministically — wobble is *designed*, not random per render:

- **Blob containers:** cards/buttons use uneven 8-value border-radius (e.g. `border-radius: 22px 19px 24px 18px / 19px 23px 18px 24px`). 3–4 preset wobble shapes (`.wob-a` … `.wob-d`) rotated through by element position so siblings never match.
- **Tilt:** stamps, annotations, avatars, badges each carry a small fixed rotation between −3° and +2.5° (`.tilt-1/-2/-3` presets, assigned by index/id). Receipt body text and numbers stay level — readability anchors the chaos.
- **Squiggle dividers:** all separators are hand-drawn SVG squiggles or uneven dash patterns (a reusable `SquiggleDivider` component / data-URI background), never `border-top: 1px solid`.
- **Sketchy strokes:** hero card and pour buttons get a 2px ink border whose blob radius makes it read hand-drawn; the glass meter, underlines, circles, and arrows are SVG paths with deliberate overshoot (lines cross slightly past corners, ellipse ends don't meet).
- **Tally marks:** strokes have per-stroke jitter in length/angle; the fifth stroke slashes through unevenly.
- **Restraint rule:** max ~one rotated element per visual group; numbers and the receipt log never tilt. Wobble lives in shapes and decoration, precision lives in data.
- **Motion:** bubbles rise in the glass meter; stamps "thump" in with a small scale-settle when a verdict changes; logging a drink draws its tally stroke. All animation respects `prefers-reduced-motion`.

Fonts are self-hosted via `@fontsource` packages (Fraunces, Caveat, Space Mono) so the PWA works offline and loads instantly.

## 3. UX architecture

Single page, mobile-first, four zones top to bottom:

1. **Tab header** — "YOUR TAB" eyebrow, handwritten session nickname (editable, e.g. "sat night w/ sam + leila"), and the **bubble row**: overlapping round avatars, one per person, each at its own tilt. Tap an avatar to switch the focused person; long-shape `+` bubble adds a person. The active avatar is bigger and front-most.
2. **Feeling card (hero)** — the focused person's live state:
   - Big Fraunces italic feeling word with a red-pen scribbled underline.
   - The **glass meter**: a wobbly-drawn glass that fills with amber toward the top; bubbles rise while BAC is climbing, settle when falling. The locked target is a red dotted line with a Caveat "hold here!" annotation.
   - Printed BAC (`0.058%`, mono, never tilted) + drift direction ("drifting down").
   - **Stamp verdict**: ON PACE / SLOW DOWN / EASY NOW / CUT OFF — rubber-stamp outline, tipsy rotation, thumps when it changes.
   - **Next pour line:** "next pour OK 23:11" (mono). This is the maintain engine speaking.
   - **Pin the vibe:** tapping the target area (or stamp row) opens a small wobbly menu of the maintainable states (today's "Barely Noticeable", "Pleasantly Relaxed", "Definitely Tipsy" from `MAINTAINABLE_STATES` — copy may be re-voiced, ranges unchanged) to pin/unpin. Pinned state persists per person per session.
3. **Pour row** — round wobbly buttons: beer / wine / cocktail / shot / `+ own` (dashed circle). Tapping logs a drink for the focused person: haptic, tally stroke draws under the button, glass meter bumps. Per-button readiness is shown by ink weight/fill (ready = filled amber, wait = outline with mono "wait 22m" beneath in faded print). `+ own` opens the custom drink form (name, ABV %, size) as a small receipt slip; custom drinks join the row with a Caveat glyph.
4. **The receipt** — the session record, printed:
   - Line items: `21:02  BEER  +0.021` per drink (all people interleaved, prefixed by initial when >1 person), occasional Caveat margin notes.
   - **The vibe chart:** hand-drawn curve of BAC over the night (one ink line per person, their color = avatar tone), solid for the past, **dashed for the forecast** (pure Widmark decay projection), red dotted "vibe line" for the focused person's target, "you are here" arrow in Caveat. Replaces the current SVG chart, same math.
   - Footer: scalloped tear edge + small print: "estimates only · never a reason to drive · drink water, you animal".
   - **Close tab:** ends the session — confirmation, then the receipt renders as a full keepsake summary (totals per person, peak state, duration, stamps earned) with a "start a new tab" action. Replaces today's bare "Reset".

**First-run / empty state:** a blank tab with one person ("you"), a Caveat note "tap a drink to start your tab", and a one-time small-print disclaimer card. Person setup (name, weight kg, body constant, color) lives behind tapping your avatar — edit-in-place on a receipt slip, same form for new people.

**Removed/replaced from current UI:** sticky session rail, FAB dock + quick-pour sheet (the bubble row + pour row replace both), "maintain bar" dropdown (replaced by pin-the-vibe), per-person cards grid (replaced by focused-person hero + interleaved receipt). One scrolling artifact instead of three competing surfaces.

## 4. Components

| Component | Job |
|---|---|
| `TabHeader.vue` | eyebrow, session nickname (editable), bubble avatar row |
| `FeelingCard.vue` | state word, glass meter, BAC, stamp, next-pour, pin-the-vibe |
| `GlassMeter.vue` | SVG wobbly glass, fill %, bubbles, target line |
| `StampVerdict.vue` | stamp rendering + thump animation |
| `PourRow.vue` | drink buttons, tallies, readiness, custom drink slip |
| `ReceiptLog.vue` | line items + margin notes |
| `VibeChart.vue` | hand-drawn past + dashed forecast + target line |
| `CloseTab.vue` | end-of-session keepsake + new tab |
| `PersonSlip.vue` | add/edit person form |
| `SquiggleDivider.vue` | reusable wobbly separator |

State stays in the existing Pinia store, renamed conceptually: a **session** (`{ id, nickname, startedAt, people, events }`) where drink events are append-only `{ id, personId, drink, timestamp }`. This shape is what makes future P2P rooms mergeable (union of events by id). LocalStorage persistence as today, with migration from the current storage key. BAC math (`utils/bac.js`) is untouched — tests already cover it; the forecast projection is a new pure function `projectBAC(history, person, untilTime)` with unit tests.

## 5. Technical scope

- **Stack:** unchanged — Vue 3, Pinia, Tailwind, Vite, Vitest. New CSS design tokens replace the current `main.css` component layer entirely.
- **PWA:** `vite-plugin-pwa` — manifest (name "Experience Alcohol", short name "Tab", theme `#FFF7EC`), maskable icons (drawn in the doodle style), offline-first service worker (app shell precache; everything is local anyway).
- **Units:** weight in kg (unchanged); drink sizes displayed as `12 oz` with ml in the custom-drink form's placeholder. Internal math stays in oz.
- **Deploy:** Vercel (CLI authenticated as beejsbj). Branch previews for phone testing during development; production deploy after the PR merges. Root base path, so PWA scope is `/`.
- **Repo hygiene:** untrack `dist/` and `.DS_Store` (gitignore them), delete stale `todo.md` and `features.md`, rewrite README (Bun-first commands, product description, disclaimer), note Node ≥ 20 requirement (`engines` field + `.nvmrc`).
- **Testing:** existing 9 tests must keep passing; add unit tests for forecast projection, session-event store actions, and storage migration. Manual verification on mobile viewport via preview before ship.

## 6. Edge cases

- Corrupt/old localStorage → migrate if possible, else fresh default session (existing pattern, kept).
- Sessions crossing midnight: all math is timestamp-based already; chart window label follows session start.
- BAC display clamps at 0; states above "Danger Zone" force the CUT OFF stamp and suppress next-pour timing entirely (no "when can I drink again" at 0.25+ — copy switches to water/look-after-them guidance).
- Removing a person keeps their events in the receipt (greyed) so totals stay honest; last person can't be removed.
- iOS Safari quirks: haptics already feature-detected; `backdrop-filter` no longer used.

## 7. Future: rooms (parked, v2)

Multi-device sessions with zero backend: WebRTC data channels with serverless signaling (Trystero over public BitTorrent/Nostr/MQTT rendezvous). Room = shared topic derived from a short code; state = CRDT-ish union of append-only drink events (the v1 data model is already shaped for this); each device persists its own copy in localStorage; the room exists only while ≥1 member is online. Not built in v1 — v1 only keeps the event-log data model compatible.

## 8. Out of scope (v1)

Rooms/sync, accounts, drink price tracking, photo features, dark theme, Apple/Google wallet passes, i18n.
