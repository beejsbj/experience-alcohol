# Experience Alcohol — the night, in glass

A live drink tracker where each person's night is a backlit stained-glass rose
window. Log drinks with a tap, watch an estimated BAC light the glass in real
time, and pin the vibe you want to hold tonight — the app times your next pour
to keep you there.

**Live:** https://experience-alcohol.vercel.app —
installable PWA, add it to your home screen.

## How it works

- **The window is a clock of the night.** Twelve petals, one per hour on a
  12-hour face, each split into two half-hour lancets and crossed by six
  rings, one per feeling (barely noticeable at the hub, feeling confident at
  the rim). All of it is always there as dark, seeded glass: the window is
  made, the night lights it. From your first pour to now, each half hour
  lights out as far as your BAC reached, in the jewel colour of the last
  drink poured (beer gold, wine ruby, cocktail violet, shot ice, anything
  else emerald).
- Every pour is a jewel set in the rim at its time. A bone hand points to
  now; a dashed line of glass not yet made shows where the night drifts.
- **The feeling word** sits under the window, huge, in Bodoni italic. Tap it
  to pin a vibe ("hold me at pleasantly relaxed"); the window gilds that
  vibe's two lead rings, and a tilted Persona-style plate judges the pace:
  ON PACE / EASY NOW / SLOW DOWN / CUT OFF, with the time of the next pour.
- **Pour** by tapping a gothic lancet of that drink's glass. A lancet that
  would overshoot your vibe goes dark and shows the wait, but still pours.
  "other" pours anything else by strength and size. The poured glass flies
  into the window and its pane flares.
- Swipe the window sideways (or tap a roundel in the header) for the next
  person. The name plate opens their menu: name, weight and body for the
  maths, left the bar, close the tab.
- **The table** is a wall of everyone's windows. "Pull up a chair" opens the
  room: a QR set in a stone medallion. Friends scan it and share one night
  phone to phone over WebRTC — no server keeps it. Each phone says which
  window is theirs.
- **Close the tab** and the night becomes a keepsake: every finished window,
  with a PNG export for the share sheet.

BAC is estimated with the Widmark formula. Everything stays in your browser's
localStorage — no accounts, no server of ours.

## Development

Requires Node ≥ 20 (see `.nvmrc`) and [Bun](https://bun.sh).

```bash
bun install
bun run dev        # http://localhost:5174
bun run test:run   # vitest
bun run build      # production build (dist/)
```

Deploys to Vercel (`bunx vercel deploy` for previews, `bunx vercel deploy --prod --yes` for production).

Design specs and implementation plans live in `docs/superpowers/`.

## The important note

This is an educational toy. Real impairment depends on food, hydration, sleep,
medication, metabolism, and more. **Never use this to decide whether you can
drive — the answer after drinking is no.**

## License

MIT
