# experience-alcohol

Drink-tracker PWA where each person's night is a backlit stained-glass rose
window (proposed in PR "The Rose Window"; the receipt UI before it is on
`main`). Vue 3 (script setup) + Pinia + Tailwind 3 + Vite 5 + Vitest. No backend:
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
  persisted to localStorage key `experience-alcohol:session:v2`.
  `closeTab()` keeps each person and their events in `lastTab.summary` so the
  keepsake can redraw their windows.
- `src/utils/bac.js` — Widmark BAC math (pure, tested).
  `src/utils/feelings.js` — feeling states, pace stamps, next-pour timing.
  `src/utils/roomMerge.js` — `mergeSessions()`: deterministic merge of two
  copies of one session (pours/custom drinks union by id, people
  last-writer-wins on `rev {t, by}`, seated by `joinedAt`). Pure, tested.
  Every person edit in the store must go through `touch()` so it carries a rev.
  `src/utils/scatter.js` — seeded randomness: same seed → same value forever.
  **Never `Math.random()` in render paths.**
- `src/utils/dial.js` — clock-face geometry (pure, tested): `angleAt` (12
  o'clock at the top, clockwise, 12h per turn), `polar`, `bandPath` (annulus
  sector), `linePath`, `archSpandrel` (stone above a pointed arch),
  `uprightRotation` (rim labels never upside down).
- `src/utils/window.js` — the window model (pure, tested). `feelingScale`
  maps BAC to radius piecewise so each feeling gets an equal ring;
  `LEAD_RINGS` are the feeling boundaries, `SCALE_MAX` (0.16, overconfident)
  is the rim. `traceryCells()` = 24 half-hour wedges × 6 rings of seeded
  unlit glass. `windowModel(events, person, {now})` → lit wedges (reach =
  peak BAC in that half hour, glass = last drink poured), forecast, pours.
  `paneBands` cuts a wedge at lead rings; `haloRange` snaps a pinned vibe to
  its rings; `GLASS` is the drink → jewel colour map.
- `src/stores/room.js` — the shared table. A room is one session shared by
  every phone: each keeps a full copy, broadcasts the whole session
  (debounced) on change, and folds others in via `mergeRemote`. Join link is
  `/#t=<code>` (hash, so the code never reaches a server log); the joiner
  adopts the table's session, stashing a solo night with pours under
  `experience-alcohol:session:before-room`. `hello` messages say which
  person each phone holds. Closing the tab sends a last snapshot and leaves.
  Transport is `src/room/trysteroTransport.js` (Trystero, WebRTC data
  channels, signaling over public Nostr relays, SDP encrypted with the room
  code); tests swap in an in-memory bus.
- `src/App.vue` — the nave (dark ground, light shaft, grain), switches
  `NightView` ⇄ `TableWall`, and hosts `Keepsake` after a tab closes.
- `src/components/RoseWindow.vue` — one person's night as SVG, drawn only
  from pours, time and pinned vibe. Layers: stone, light bleed, unlit glass,
  lit panes (mottle filter + per-pane backlit sheen), tracery (lead, 12 stone
  mullions, pointed-arch spandrels), gilded halo rings, forecast, rim with
  numerals (inner half) and pour jewels (outer half), hand, hub quatrefoil.
  `detail="mini"` drops numerals, forecast, bleed. `intro` plays the
  entrance (lead draws in, glass fades up, panes light in time order; ends
  when its animations finish). A new pour blooms the lit glass and sends a
  ring from the hub. Filter ids come from a module counter.
- `src/components/NightView.vue` — the main screen: name plate, header
  roundels (`RoseIcon.vue`: hub quatrefoil in current glass + initial),
  the window (swipe sideways = next person; sized by viewport height so the
  pours stay in reach), feeling word, verdict plate + next pour, `PourRow`.
- `src/components/PourRow.vue` — gothic lancets per drink; a lancet that
  would overshoot the vibe goes dark with "wait 2h35" but still pours; a
  glass drop flies into the window. `CustomDrinkSheet.vue` for "other".
- Sheets (`.sheet`, blood slash): `VibeSheet.vue`, `PersonMenu.vue`,
  `RoomMedallion.vue` (QR in a jewelled stone medallion).
  `TableWall.vue` — everyone's mini windows, room invite, seat claiming.
  `Keepsake.vue` — finished windows + PNG export (clones the SVG, inlines
  computed styles, draws onto a 1080×1350 canvas with caption and fine print).

## Design rules (proposed with the Rose Window PR — see `docs/superpowers/specs/2026-09-25-rose-window-design.md`)

- One huge element or a dense wall, never a dashboard: the window dominates
  the night view; the table is a collage of windows.
- Nothing may look like a web element or form: labels are tilted plates,
  fields are bare type on an underline. No visible scrollbars, ever.
- Three voices, three fonts only: Bodoni Moda italic (the night *announces*
  how it feels — the feeling word, vibes), Anton caps on tilted Persona
  plates (the bar *warns and labels* — names, verdicts, buttons), JetBrains
  Mono small (the maths *whispers* — BAC, times, fine print). Handwriting is
  not a voice here.
- Palette in `src/assets/main.css` `:root`: nave, stone, lead, bone, gold,
  blood, ice; drink glass in `GLASS` (`src/utils/window.js`). Blood is for
  warnings and the Persona offset; gold is for what you chose (the vibe
  halo, the current window).
- The window is always made; the night only lights it. Unlit glass stays
  dark and seeded; lit glass must be the brightest thing on screen.
- Randomness must be structural and seeded (scatter.js), not decorative.
- Motion: one orchestrated entrance per window and one flare per pour;
  everything respects `prefers-reduced-motion` (durations and delays drop to
  zero, bloom and ring are skipped).
- Keep "estimates only · never a reason to drive" on the night view and on
  the exported keepsake; never frame anything as safe to drive.

## Docs & history

- Specs: `docs/superpowers/specs/` (v1 doodled-tab → v2 receipt-deck →
  v2.1 receipt-pile → v2.2 polish → 2026-09-25 rose window; each supersedes
  the visual layer of the last, logic/PWA sections of v1 still
  authoritative). Screens: `docs/screens/rose-window/`.
- Plans: `docs/superpowers/plans/` (executed; checkboxes not ticked — git
  history is the source of truth).
- Branch `redesign/rose-window` is a proposal PR against `main`. Merge only
  with explicit user approval. Commit style: `feat:`/`fix:`/`polish:`/`docs:` one-liners.
- Rooms: no backend we run. Known limit — WebRTC without a TURN server can
  fail across strict mobile carrier NATs; same wifi always works.
