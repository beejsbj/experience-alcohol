# Last Call — v3 design

Date: 2026-09-25
Supersedes the visual layer of v2.2 (receipt polish). Logic, store, rooms,
gesture thresholds (`decideRelease`) and PWA sections of earlier specs remain
authoritative.

## Why

v2.2 had the right soul — paper receipts on a bar table, a printer that
states facts and a pen that annotates them — but it read as amateur:

- **No bones.** Fields floated at seeded offsets with large gaps and no grid;
  bottom chrome overlapped the paper.
- **No light.** A flat brown table and a white card with a drop shadow looked
  like a web page, not an object on a surface.
- **Arrows everywhere.** "Bare value + pen arrow + label" applied to every
  field turned into clutter. Real receipts get their elegance from *printed*
  structure: masthead, rules, columns, totals, a barcode.
- **Disabled-looking controls.** Hatched grey pour stickers read as greyed-out
  buttons.

v3 takes the same ingredients and commits to them as physical objects under
one lamp.

## The room: one lamp over a bar top

`BarTop.vue` replaces `BubbleField` + `.table-grain`. One fixed layer:

1. **Oak planks** — CSS gradients for seams and plank tone; SVG
   `feTurbulence` + contour `feComponentTransfer` for growth-ring figure and
   fibre (data URIs in `main.css`).
2. **Ring stains** (`RingStains.vue`) — every pour sets a glass down at a
   position seeded by the event id (`ringFor` in `utils/paper.js`). A ring is
   wet and glossy for ~25 minutes, then dries to a faint stain. Footprint size
   follows the glass (pint > coupe > wine foot > shot). The table remembers
   the night.
3. **Lamp** — a lacquer reflection pooled at the top third.
4. **Dust** (`LampDust.vue`, the only canvas) — seeded motes drifting up
   through the beam; visible only where the lamp reaches.
5. **Vignette** — tunnel vision. `--drunk` (0..1, BAC/0.12, a registered
   `@property` so it transitions) narrows the light and darkens the edges;
   the lamp sways and the dust swims more as it rises.

## Voices (three faces, still two voices)

| Voice | Face | Used for |
| --- | --- | --- |
| Printer | Martian Mono, `font-stretch: 75%` (`.print`) | line items, labels, small print |
| Printer, double-strike | Doto 900 dot matrix (`.dots`) | masthead, BAC reading, totals |
| Pen | Nanum Pen Script (`.pen`, `.pen--hard`) | name, feeling, notes, circles |

Caveat and Space Mono are retired. Doto's own full stop renders as a plus at
900, so decimals use `.dot-point` (a printed square).

## The receipt (`PersonReceipt.vue`)

`ReceiptPaper.vue` wraps every paper surface: seeded torn teeth at both ends
(`tornEdge`), a shadow outside the clip so the tear can't cut it, lamp hotspot,
edge curl, fibre texture. The pile adds `.is-lifted` while dragging so the
shadow grows as the paper leaves the wood.

Top to bottom:

1. Pen-test scribble in the corner (`ColorScribble`) — tap to grab the next
   pen; every mark switches ink. No popup menu.
2. Masthead: `EXPERIENCE` in dot matrix, `ALCOHOL`, a tagline; then
   `TBL / TAB № / OPEN` seeded from the session id (`tabNumbers`).
3. Guest: printed `GUEST 01`, the name scrawled large, `F 62KG` printed (tap
   to toggle/edit), pen tally of pours.
4. The headline: the feeling in heavy pen with a seeded underline swash; the
   BAC in dot matrix; the rubber-stamp verdict (grit mask, seeded tilt, thump
   on change); the next-pour note.
5. `ThermalChart.vue`: printed baseline with hour ticks, a dotted `.08` guide,
   everyone else as faint dotted traces with initials, this person's night as a
   solid trace over a dot-dither fill, dashed forecast. In pen: a highlighter
   swipe over the held vibe (labelled "hold"), a loose loop round now, and a
   note ("you — fresh one" / "you, easing off").
6. `VibeScale.vue`: `BARELY  RELAXED  TIPSY` printed as options; holding one
   is a pen circle drawn round it (tap again to let go). Replaces the dropdown.
7. Ledger in fixed grid columns, new lines fed out of the print head
   (`print-line` steps animation). House specials marked with a pen ✶.
8. Totals: `POURS` (dot matrix), `STD DRINKS` (`standardDrinks`, 0.6 oz pure
   alcohol each), `PEAK EST.` (`peakBAC`).
9. Seeded barcode, small print, "left the bar", and a dotted scissor line —
   `✂ CLOSE THE TAB` — that asks once before closing.

## Pouring: glasses on the bar mat (`PourMat.vue`)

Pour controls leave the paper and sit on a rubber bar mat fixed at the rail,
always under the thumb. Each drink is a glass seen from above
(`GlassTopDown.vue`): pint with a foam head, wine, coupe with a lemon twist,
heavy shot glass, and house specials in a tumbler with ice, their liquid
colour seeded from the drink.

A glass's fill **is** the pace: pouring drains it; it refills over exactly the
wait the pace engine asks for (`1 - wait / waitRightAfterLastPour`); a full
glass glints. Tapping a glass that isn't full still logs the drink (warning
haptic). Cut off → every glass stays empty and reads "water".

House specials are written on a cocktail napkin (`NapkinSlip.vue`) — tap a
number to scratch a new one, stamp `ON THE MAT` to add.

Chrome on the wood above the paper (under it once it slides up):
"flick for <next name> →" and "pinch for the table ⤡", both tappable.

## The table (`TableView.vue`)

Mini receipts tossed onto the wood (seeded tilt/offset, staggered), a beer
coaster that invites a friend's phone, and a thermal receipt printer at the
end of the bar — "tear one off +" — for a newcomer.

The invite (`RoomSlip.vue`) is a big coaster: table code and "peer to peer ·
no server keeps it" printed round the rim, QR in the middle, "or send the
link →" in pen.

## Closing (`CloseTab.vue`)

The keepsake prints line by line, then `PAID` is slammed across it in red.
"start a fresh tab →" in amber pen on the table.

## Rules that changed

- Printed labels are allowed where a real receipt prints them (`GUEST`,
  `POURS`, `STD DRINKS`, `TAB №`). The pen still never writes captions.
- Pen arrows are used sparingly (one, pointing at the vibe options when none
  is circled) instead of on every value.
- Amber stays off the paper; it's the pen colour *on the wood* (hints, mat
  labels, table heading).
- Inks are real pens: vermilion, blue, green, plum, teal (`PERSON_COLORS`).
