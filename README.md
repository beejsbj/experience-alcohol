# Experience Alcohol — your tab

A live drink tracker styled as a pile of paper receipts on a bar table. Log
drinks with a tap, watch an estimated BAC drift in real time, and pin the vibe
you want to hold tonight — the app times your next pour to keep you there.

**Live:** https://experience-alcohol.vercel.app —
installable PWA, add it to your home screen.

## How it works

- Every person gets a full-screen paper receipt. The pile is physical: the
  paper follows your finger in both axes — throw it sideways for the next
  person's tab, fling it up (or pull it down from the top) to set it on the
  table for a birds-eye view of everyone, tap a scrap to pick it back up.
- Drinks log from sticker pour strips stuck on the receipt; on cooldown they
  gray out and a pencil hatch "dries" off as the wait runs down.
- The receipt prints the facts (tally strokes, weight, the chart, the ledger
  of every pour) and a human annotates them in ballpoint — arrows labeling
  "drinks", "weight, kg", "you are here", "next pour".
- Pin a vibe ("hold tipsy") — a sticker with a push pin through it next to the
  feeling — and a rubber stamp judges the pace: ON PACE / EASY NOW /
  SLOW DOWN / CUT OFF.
- The rough chart draws the night: solid ink for the past, dashed for the
  forecast, an amber dotted line for the vibe you're holding.
- CLOSE TAB ends the night with a keepsake receipt.

BAC is estimated with the Widmark formula. Everything stays in your browser's
localStorage — no accounts, no server.

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
