# Experience Alcohol — your tab

A live drink tracker styled as the bar tab you doodled on. Log drinks with a tap,
watch an estimated BAC drift in real time, and pin the vibe you want to hold
tonight — the app times your next pour to keep you there.

**Live:** https://experience-alcohol.vercel.app —
installable PWA, add it to your home screen.

## How it works

- Each person is a wobbly bubble on the tab; tap to switch, tap twice to edit.
- Drinks log as ballpoint tally strokes and print on tonight's receipt.
- The glass meter fills toward your pinned vibe ("hold here!"); stamps judge the
  pace: ON PACE / EASY NOW / SLOW DOWN / CUT OFF.
- The vibe line charts the night — solid ink for the past, dashed for the
  forecast.
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

Deploys to Vercel (`bunx vercel deploy` for previews, `bunx vercel --prod` for production).

## The important note

This is an educational toy. Real impairment depends on food, hydration, sleep,
medication, metabolism, and more. **Never use this to decide whether you can
drive — the answer after drinking is no.**

## License

MIT
