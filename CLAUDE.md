# experience-alcohol

Drink-tracker PWA styled as a pile of hand-annotated paper receipts on a bar
table. Vue 3 (script setup) + Pinia + Tailwind 3 + Vite 5 + Vitest. No backend:
all state in localStorage. Live at https://experience-alcohol.vercel.app.

## Environment (read first)

- The default shell node is **v16 and breaks Vite/Vitest**
  (`crypto$2.getRandomValues is not a function`). Prefix every bun/bunx/vite
  command with:
  `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && `
- Package manager: **Bun** (`bun.lockb`). Never commit a `package-lock.json`.
- Tests: `bunx vitest run` (36 tests across 5 files, all green expected).
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
  `src/utils/feelings.js` — feeling states, pace stamps, next-pour timing.
  `src/utils/pileGestures.js` — `decideRelease()`: all drag-release thresholds
  for the pile (pure, tested).
  `src/utils/scatter.js` — seeded jitter ("dried ink"): same seed → same
  wobble forever. **Never `Math.random()` in render paths.**
- `src/App.vue` — table background + canvas `BubbleField` + grain overlay,
  switches `ReceiptPile` ⇄ `TableView` via fade transition.
- `src/components/ReceiptPile.vue` — the gesture heart. All receipts stacked
  absolutely; top card dragged 1:1 both axes via pointer events (no gesture
  library, no native scrolling anywhere). Release → `decideRelease`: any
  horizontal throw flips to the next receipt (wraps the pile); vertical drag is
  reserved for scrolling/reading the paper and never flips. A two-pointer pinch
  (zoom-out) tosses the pile onto the table view.
- `src/components/PersonReceipt.vue` — one person's full receipt: masthead,
  identity, tally, rough chart, feeling + pinned-vibe sticker, stamp, pour
  stickers, ledger, small print.
- Supporting: `InkArrow.vue` (seeded hand-drawn annotation arrows),
  `ColorScribble.vue` (corner color picker), `PourTiles.vue` (sticker pour
  strips + cooldown hatch), `RoughChart.vue`, `TallyStrokes.vue`,
  `WriteOn.vue`, `PushPin.vue`, `StampVerdict.vue`, `TableView.vue`,
  `CloseTab.vue`, `BubbleField.vue` (only canvas in the app).

## Design rules (user's taste — enforced)

- Nothing may look like a web element or form. No visible scrollbars, ever.
- Two fonts only: Space Mono (the receipt *prints* facts) and Caveat (a human
  *annotates* in pen). Printed values stand bare; handwriting labels them with
  arrows — never captions like "drinks:".
- Randomness must be structural and seeded (scatter.js), not decorative.
- Palette in `src/assets/main.css` `:root`: paper `#FAFAF7`, ink, faded print,
  pen blue, red pen, green ink, amber (amber only on the dark table, never on
  paper as fill).
- Reference for drag feel: tinder-style card stack — paper follows the finger,
  velocity decides the throw.

## Docs & history

- Specs: `docs/superpowers/specs/` (v1 doodled-tab → v2 receipt-deck →
  v2.1 receipt-pile addendum; each supersedes the visual layer of the last,
  logic/PWA sections of v1 still authoritative).
- Plans: `docs/superpowers/plans/` (executed; checkboxes not ticked — git
  history is the source of truth).
- Branch `redesign/doodled-tab`, PR #2. Merge only with explicit user
  approval. Commit style: `feat:`/`fix:`/`polish:`/`docs:` one-liners.
- Parked post-v1: multi-device rooms — decentralized P2P (Trystero-style
  WebRTC, serverless signaling), no backend we run.
