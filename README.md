# Experience Alcohol — your tab

A live drink tracker styled as a pile of paper receipts on a bar table. Log
drinks with a tap, watch an estimated BAC drift in real time, and pin the vibe
you want to hold tonight — the app times your next pour to keep you there.

**Live:** https://experience-alcohol.vercel.app —
installable PWA, add it to your home screen.

## How it works

- A new receipt asks before it assumes: who it's for, which body (for the
  math), roughly how heavy — and hands over a pen.
- One lamp over an oak bar top. Every person gets a thermal receipt; the pile
  is physical — the paper lifts and follows your finger, throw it sideways
  for the next person's tab, pinch to set everything on the table.
- The printer states the facts in dot matrix and condensed mono: the BAC,
  a dither-printed chart of the night, every pour as a line item, totals,
  a barcode. Then the table writes all over it: the name, how you're
  feeling (underlined neatly when sober, loopier later), when the next pour
  is, a loop round "now", friends' doodles and notes in their own inks.
- Drinks are glasses on the rubber bar mat. Tap one to drink it; it drains
  and refills over exactly the wait the pace asks for. Write your own house
  special on a cocktail napkin — circle a pint, mug, can, bottle, wine,
  bubbly, highball or rocks and a rough strength.
- Circle a vibe to hold it (barely · relaxed · tipsy) — a highlighter band
  marks it on the chart and the pen judges the pace: on pace ✓ / easy now… /
  slow down! / cut off.
- Every pour leaves a glass ring on the wood that dries as the night goes
  on, and the room closes in a little as your estimate climbs.
- On the table: everyone's receipt at a glance, a beer coaster with a QR to
  bring a friend's phone to the table, a receipt printer to tear off a tab
  for a newcomer. Share the table by QR, by reading out the code, or by
  sending the link; a friend can type the code in on the back of their
  coaster. Cut along the scissor line to close the tab and keep the receipt
  with "paid!" scrawled across it.

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
