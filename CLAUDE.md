# experience-alcohol

Drink-tracker PWA styled as a pile of hand-annotated thermal receipts on a
lamp-lit oak bar top ("Last Call", v3). Vue 3 (script setup) + Pinia + Tailwind 3 + Vite 5 + Vitest. No backend:
all state in localStorage. Live at https://experience-alcohol.vercel.app.

## Environment (read first)

- The default shell node is **v16 and breaks Vite/Vitest**
  (`crypto$2.getRandomValues is not a function`). Prefix every bun/bunx/vite
  command with:
  `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && `
- Package manager: **Bun** (`bun.lockb`). Never commit a `package-lock.json`.
- Tests: `bunx vitest run` (all green expected).
- Dev server: port 5174 (`.claude/launch.json` has the preview config).
- Deploy: Vercel CLI, project `beejsbjs-projects/experience-alcohol`. Hashed
  deployment URLs are SSO-gated; the public URL only updates via
  `bunx vercel deploy --prod --yes`.
- Headless-preview quirk: the preview page can be `visibilityState: hidden`,
  which freezes rAF and stalls Vue `<Transition>` swaps mid-leave. Shim
  `requestAnimationFrame` with setTimeout via preview_eval before testing view
  switches — it is not an app bug.

## Architecture

- `src/stores/session.js` — single Pinia store. Append-only event model:
  `session { id, nickname, startedAt, people[], events[], customDrinks[] }`,
  persisted to localStorage key `experience-alcohol:session:v2`. Shaped this
  way so future P2P "rooms" can merge logs (rooms are parked post-v1).
- `src/utils/bac.js` — Widmark BAC math (pure, tested).
  `src/utils/feelings.js` — feeling states, pace verdicts (`stampFor`), next-pour timing.
  `src/utils/pileGestures.js` — `decideRelease()`: all drag-release thresholds
  for the pile (pure, tested).
  `src/utils/roomMerge.js` — `mergeSessions()`: deterministic merge of two
  copies of one session (pours/custom drinks union by id, people
  last-writer-wins on `rev {t, by}`, seated by `joinedAt`). Pure, tested.
  Every person edit in the store must go through `touch()` so it carries a rev.
  `src/utils/scatter.js` — seeded jitter ("dried ink"): same seed → same
  wobble forever. **Never `Math.random()` in render paths.**
  `src/utils/doodles.js` — friends' doodle library + `friendMarks()` (which
  doodles sit in which slots, in whose ink, accruing with table pours),
  `friendNote()`, and the feeling-underline family. Pure, tested.
  `src/utils/paper.js` — `tornEdge()` (seeded clip-path teeth), `barcode()`,
  `ringFor()` (where a pour's glass ring sits and how wet it still is). Pure,
  tested. `src/utils/receipt.js` — `standardDrinks`, `peakBAC`, `tabNumbers`,
  `clock`. Pure, tested.
- `src/stores/room.js` — the shared table. A room is one session shared by
  every phone: each keeps a full copy, broadcasts the whole session
  (debounced) on change, and folds others in via `mergeRemote`. Join link is
  `/#t=<code>` (hash, so the code never reaches a server log), or type the
  code on the coaster's back (`parseRoomCode` takes code or link); the joiner
  adopts the table's session, stashing a solo night with pours under
  `experience-alcohol:session:before-room`. `hello` messages say which
  receipt each phone holds. Closing the tab sends a last snapshot and leaves.
  Transport is `src/room/trysteroTransport.js` (Trystero, WebRTC data
  channels, signaling over public Nostr relays, SDP encrypted with the room
  code); tests swap in an in-memory bus.
- `src/App.vue` — `BarTop` (oak planks, `RingStains`, lamp, `LampDust`
  canvas, BAC-driven vignette via `--drunk`) behind everything; switches
  `ReceiptPile` ⇄ `TableView` via fade transition.
- `src/components/ReceiptPile.vue` — the gesture heart. All receipts stacked
  absolutely; top card dragged 1:1 both axes via pointer events (no gesture
  library, no native scrolling anywhere). Release → `decideRelease`: any
  horizontal throw flips to the next receipt (wraps the pile); vertical drag is
  reserved for scrolling/reading the paper and never flips. A two-pointer pinch
  (zoom-out) tosses the pile onto the table view. The top card gets
  `.is-lifted` while dragged (bigger shadow). `PourMat` sits fixed at the
  bottom for the focused person; the paper scrolls until it clears it.
- `src/components/PersonReceipt.vue` — one person's thermal receipt inside
  `ReceiptPaper`: dot-matrix masthead, TBL/TAB/OPEN line, then either
  `IntroFlow` (a new face: name, body, weight, pen — `person.needsIntro`) or
  guest + handwritten body/weight + tally, feeling headline + variable
  underline + BAC + pen verdict (`VerdictNote`) + next-pour note, a friend's
  signed note, `ThermalChart`, `VibeScale` (circle one to hold it), ledger,
  totals, barcode, small print, scissor close-tab line — with friends'
  `Doodle`s in eight seeded slots.
- `src/components/PourMat.vue` — rubber bar mat of top-down drinks
  (`GlassTopDown.vue`: pint, mug, wine, coupe, shot, flute, highball, can,
  bottle, tumbler); a glass's fill is the pace (drains on pour, refills over
  the wait; cans/bottles come back sealed). Slides sideways when full.
  `NapkinSlip.vue` writes a house special from vessel + strength presets.
- Supporting: `ReceiptPaper.vue` (torn, lit paper), `ThermalChart.vue`,
  `VibeScale.vue`, `VerdictNote.vue`, `FeelingUnderline.vue`, `Doodle.vue`,
  `SexGlyph.vue`, `WeightRuler.vue`, `VesselIcon.vue`, `Barcode.vue`, `ColorScribble.vue` (pen-test squiggle — tap cycles ink),
  `IdentityLine.vue`, `InkArrow.vue`, `TallyStrokes.vue`, `WriteOn.vue`,
  `TableView.vue` (tossed mini receipts, coaster invite, receipt printer),
  `RoomSlip.vue` (the QR coaster), `CloseTab.vue` (PAID keepsake),
  `LampDust.vue` (only canvas in the app).

## Design rules (user's taste — enforced)

- Nothing may look like a web element or form. No visible scrollbars, ever.
- Two voices: the printer (Martian Mono condensed `.print`, Doto dot matrix
  `.dots` for big numbers) states facts; a human (Nanum Pen Script `.pen`)
  annotates. Printed labels only where a real receipt prints them (GUEST,
  POURS, TAB №); the pen never writes captions like "drinks:". Arrows
  sparingly.
- Everything is lit by one lamp: paper, wood, glass. Objects, not cards.
- It's receipt paper a group of friends are writing all over: pen notes,
  arrows and doodles in friends' inks. No rubber stamps. Nothing personal is
  printed — name, body and weight are written in; a new face is asked, not
  assumed.
- Pointer capture in the pile starts only once a drag moves; capturing on
  touch-down retargets taps on the paper to the card.
- Randomness must be structural and seeded (scatter.js / paper.js), not
  decorative.
- Palette in `src/assets/main.css` `:root`: warm thermal paper, print ink,
  faded print, the person's pen, oak/lamp/brass for the table, amber (amber
  only on the dark table — hints, mat labels — never on paper).
- Spec for the current look: `docs/superpowers/specs/2026-09-25-last-call-v3-design.md`
  + `2026-09-25-last-call-v3.1-friends-addendum.md`.
- Reference for drag feel: tinder-style card stack — paper follows the finger,
  velocity decides the throw.

## Docs & history

- Specs: `docs/superpowers/specs/` (v1 doodled-tab → v2 receipt-deck →
  v2.1 receipt-pile → v2.2 polish → v3 last call → v3.1 friends; each supersedes the visual
  layer of the last, logic/PWA sections of v1 still authoritative).
- Plans: `docs/superpowers/plans/` (executed; checkboxes not ticked — git
  history is the source of truth).
- Branch `redesign/doodled-tab`, PR #2. Merge only with explicit user
  approval. Commit style: `feat:`/`fix:`/`polish:`/`docs:` one-liners.
- Rooms: no backend we run. Known limit — WebRTC without a TURN server can
  fail across strict mobile carrier NATs; same wifi always works.
