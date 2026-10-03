# The bar as a character — v3.2 design

Date: 2026-10-03
Amends `2026-09-25-last-call-v3-design.md` and the v3.1 friends addendum.
Logic, store, rooms, gestures and PWA sections of earlier specs stay
authoritative.

## Why

The receipt already has two voices: the printer states facts, friends scrawl
on it in their pens. Feedback after v3.1:

- The one signed note under "next pour" reads as *the bar* talking, but it is
  written in a friend's pen, with a weak up-arrow, and it crowds the chart
  (the `.08` label and the "you — fresh one" annotation).
- Doodles repeat quickly: fifteen shapes and nine words, drawn from the same
  pool regardless of what is being poured.
- Only three holdable levels (barely / relaxed / tipsy), and the headline
  words ("pleasantly relaxed", "inhibitions gone") are a sommelier's register,
  not a bar's.
- The app still prints `EXPERIENCE ALCOHOL`; it needs a name.

## A third voice: the bar

The bar is the recurring character. It has seen everything, likes you, swears,
and will not flatter you. It writes in **black marker** — a chisel-tip Sharpie
on thermal paper — never a ballpoint, never in a friend's colour.

| Voice | Face | Colour | Says |
| --- | --- | --- | --- |
| Printer | Martian Mono condensed `.print`, Doto `.dots` | print ink | facts |
| Friends | Nanum Pen Script `.pen` | each friend's pen (`PERSON_COLORS`) | notes, doodles, circles |
| **The bar** | **Permanent Marker `.marker`** | **`--marker` #141210 (near-black)** | **one line at a time** |

### Font

`@fontsource/permanent-marker` (latin-400). Chosen over Rock Salt (scratchy,
too wide to fit a short line beside "next pour", and hard to read under 16 px)
and Caveat Brush (too close to Nanum's handwriting). Permanent Marker is
unmistakably a different implement — a fat marker next to thin ballpoints —
which is the whole point: you should be able to tell who wrote it before you
read it.

### Voice rules

- Short. One line, two at most; it is a scrawl in a margin, not a paragraph.
- Warm and dry. It roots for you. It takes the piss, it does not shame.
- R-rated is allowed: swearing, innuendo, the occasional filthy aside.
- It never encourages drinking faster or more, never mocks someone for
  stopping, never jokes about driving, and goes quiet-serious past cut-off.
- It never writes captions ("drinks:"). It comments.
- It is not signed. The hand is the signature.

### Where it writes

The empty paper to the right of "next pour ~HH:MM". The row becomes
`flex-wrap justify-between`: the pen note left, the bar's line right-aligned
in a block capped at ~48 % of the paper. When the pen note is long ("pour
whenever you like", "water now. that's the night.") the block wraps under it,
still right-aligned, still above the chart's headroom. Nothing overlaps the
chart at any width.

No arrow. The marker hand and the position already say who is speaking and
what about. The old up-arrow is removed.

It is **written on**: each character is an inline-block with a seeded tilt and
a `char-in` animation staggered ~22 ms per character (transform + opacity
only). The block is keyed on the text, so a new line is written over the old
one rather than swapped.

### The library — `src/utils/barkeep.js`

~300 lines, grouped by topic. `barLine(ctx)` picks one, pure and seeded.

| Topic | Trigger (from ctx) | Weight |
| --- | --- | --- |
| closing | `closing` (the scissor line was tapped once) | exclusive |
| cutOff | `bac >= CUTOFF_BAC` | exclusive |
| getHelp | `bac >= 0.35` | exclusive, overrides cutOff |
| water | last ledger line is water and under 12 min old | 6 |
| firstPour | pours === 1, under 12 min old | 6 |
| milestone | pours in {3, 5, 7, 10, 12, 15, 20}, under 12 min old | 5 |
| slowDown | verdict SLOW DOWN | 5 |
| easyNow | verdict EASY NOW | 3 |
| onPace | verdict ON PACE and pours ≥ 2 | 2 |
| mixing | ≥ 3 distinct alcoholic types poured | 3 |
| shots | last pour was a shot | 3 |
| beer / wine / cocktail / house | last pour's type (house = a custom drink) | 2 |
| wasted / drunk / loose / tipsy / relaxed / barely / sober | feeling state | 3 |
| comingDown | no pour for 45 min, bac falling, bac > 0.02 | 4 |
| holding | a vibe is pinned, verdict ON PACE, pours ≥ 2 | 3 |
| lateNight / smallHours / morning / early | hour buckets 23–01 / 01–05 / 05–11 / before 19 | 2 |
| name | has a real name (templated `{name}` / `{initials}`) | 1.5 |
| banter | always | 1 |

Selection: topics with weight > 0 form a pool; a seeded roll picks the
topic by weight, then a line within it. Exclusive topics short-circuit.

**Seed = `bar:<personId>:<beat>`**, where `beat` is a string of the
*bucketed* facts: pour count, verdict, feeling state, hour, water count,
15-minute "since last pour" bucket, pinned state, closing flag. The line
therefore changes at meaningful moments — a pour, a verdict change, a new
hour — and is otherwise stable. Nothing in it reads the live BAC directly, so
the second-hand tick never recomputes it.

The same function writes the bar's sign-off on the closed-tab keepsake
(`closing: true`, seeded by `closedAt`).

### Friends' notes stay — and move

`friendNote` remains a friend's voice (their pen, signed). It moves off the
chart to the totals block, in the gap between `POURS / STD DRINKS / PEAK` and
their numbers, tilted, two lines max, no arrow. The smiley that used to live
there (slot 4) moves to the "left the bar" line. Nothing in the chart's
headroom but the chart's own pen notes.

## Doodles — a bigger, contextual library

`src/utils/doodles.js` grows from 15 shapes + 9 words to ~55 shapes + ~35
words, and splits placement into three systems. Everything is seeded; marks
already on the paper never move.

### 1. Paper marks (`friendMarks`, the eight slots) — unchanged mechanics

Pool: decor shapes ∪ words ∪ **initials** (`word:` of the person's initials
when they have a name, boxed) ∪ **time-of-start** shapes (moon / zzz when
the tab opened after 23:00; sun / coffee before 17:00). Appearance still
scales with table pours. The pool only uses facts that never change during a
night, which is what keeps placed marks still.

### 2. Ledger marks (`ledgerMarks(personId, events, person)`) — new

Each ledger line gets a seeded ~40 % chance of a small doodle (16 px) drawn
right after the drink name, in a friend's ink. The pool for a line is built
from that line only, so it is stable forever:

| Fact about the line | Candidates |
| --- | --- |
| beer / mug / can / bottle | pint, foam, can, bottle, pretzel |
| wine / flute | wine glass, grapes, bubbles, cheers |
| cocktail / highball | umbrella, cherry, olive, lime, straw |
| shot | shot glass, flame, lemon, skull-lite, `word:oof` |
| water | drop, halo, `word:H2O`, `word:bless`, `word:good` |
| house special | star, `word:fancy`, `word:ooh` |
| it's the 3rd / 5th / 7th / 10th pour | `word:3!`, `word:5!!`, dice, crown, skull |
| BAC right after it ≥ 0.10 / ≥ 0.16 | tongue face / spiral-eyes face, `word:ur drunk` |
| poured after 01:00 | moon, zzz, pizza |
| first pour after 45+ min gap | `word:round 2`, `word:back?`, boomerang |
| in the first 10 min of the tab | `word:go!`, rocket |

Chance rises slightly with the line's index (friends get scribblier as the
night goes), capped at ~55 %.

### 3. State mark — new

One doodle beside the feeling headline that *is allowed to change*: it
tracks the state, keyed on it, and redraws with a stroke animation when the
state changes. Faces for level (neutral → smile → wink → tongue out →
spiral eyes → x eyes), a parachute when coming down, an anchor when a vibe is
held and on pace, a halo after water.

### Drawing

`Doodle.vue` gains stroke animation: every path gets `pathLength="100"`,
`stroke-dasharray`, and the `pen-draw` keyframe, staggered per stroke. Word
doodles use the same char-in as the bar's marker. `animation: none` under
`prefers-reduced-motion` is already global.

### R-rated

Cheeky, not gross: eggplant, peach, kiss mark, middle finger (only at
tipsy+ in the ledger pool), `word:fuck yeah`, `word:ur drunk`, `word:69`.
No vomit, no needles, no genitals drawn.

## Feeling levels

`FEELING_STATES` keeps its `state` keys (they are persisted in `pinnedState`
and merged across phones) and gains a `word` — the pen word on the paper.

| BAC | `state` (unchanged key) | `word` (new) | holdable |
| --- | --- | --- | --- |
| 0 – 0.01 | Sober | sober | — |
| 0.01 – 0.03 | Barely Noticeable | barely | yes |
| 0.04 – 0.06 | Pleasantly Relaxed | relaxed | yes |
| 0.07 – 0.09 | Definitely Tipsy | tipsy | yes |
| 0.10 – 0.12 | Inhibitions Gone | **loose** | **yes (new)** |
| 0.13 – 0.15 | Feeling Confident | drunk | no |
| 0.16 – 0.19 | Overconfident | **wasted** | no |
| 0.20 – 0.25 | Memory Blanks | gone | no |
| 0.25 – 0.35 | Danger Zone | too far | no |
| 0.35 + | Life Threatening | get help | no |

- `VibeScale` prints `BARELY  RELAXED  TIPSY  LOOSE` (from `word`).
- The headline, the table scraps and the keepsake's "peaked …" use `word`.
- `stampFor` with LOOSE pinned: ON PACE ≤ 0.12, EASY NOW < 0.15, SLOW DOWN
  after. `CUTOFF_BAC` stays 0.25. Unpinned thresholds unchanged.
- The bar stops joking at "too far" and "get help"; the headline stays
  plain there on purpose.

## The name

Proposal only — code, manifest and masthead are not touched in this PR.

| Name | Case for | Case against |
| --- | --- | --- |
| **Open Tab** (recommended) | It is literally what is on screen: a tab that is still open. Says "the night is ongoing" rather than "the night is over". Reads well in dot matrix on the masthead (`OPEN TAB`), and "close the tab" at the bottom already rhymes with it. Works as a verb for the share action ("open the table"). | Generic enough to collide with browser-tab apps in a store search. |
| Last Call | The current spec's name; evocative, bar-native, and the bar's own closing line. | Names the *end* of the night; many existing apps use it; a touch melancholy for a thing you open at 8 pm. |
| The Damage | "What's the damage?" is exactly the question the receipt answers; funny and adult. | Frames a pace-keeping app around regret. Hard to say warmly. |
| Proof | Short; alcohol proof and a receipt as proof. | Abstract, widely used, says nothing about friends or a table. |
| Settle Up | The last thing a table does; social. | Sounds like a bill-splitting app. |

Recommendation: **Open Tab**, with "last call" kept as the bar's phrase at
closing time. If Burooj prefers Last Call, nothing here needs to change.

## Judgment calls Burooj may want to overrule

1. **Marker font: Permanent Marker**, not Rock Salt. Swap is one import and
   one `--font-marker` line.
2. **The bar is unsigned.** No "— the bar". Add a signature in `BarNote.vue`
   if the hand isn't enough.
3. **No arrow at all** beside the bar's line; the old up-arrow is gone rather
   than redrawn. `InkArrow` still exists for "circle one to hold it".
4. **Friends' notes moved to the totals block**, not deleted. If one voice in
   that region is enough, remove `friendNote` from `PersonReceipt` and the
   util can stay for the table scraps later.
5. **LOOSE is holdable at 0.10–0.12.** That is a deliberate adult-register
   choice; the pace engine will happily time pours toward 0.12. If that is
   too permissive, drop it from `MAINTAINABLE_STATES` and keep the word.
6. **State keys stay as the old strings** ("Inhibitions Gone" etc.) so saved
   sessions and room merges keep working; only the displayed `word` changes.
   A migration could rename them later.
7. **Ledger doodle rate ~40–55 %.** Tunable constant in `ledgerMarks`.
8. **R-rated content level**: swearing freely, innuendo mild. If it is too
   tame or too much, the lines are plain arrays in `barkeep.js`.
9. **The bar's line re-picks on each "beat"** (pour, verdict, state, hour).
   If that feels too chatty, drop `hour` from the beat key.
10. **Name**: Open Tab recommended; not applied.
