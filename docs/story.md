# The story — draft arc (BJS-63)

**Chosen angle:** *Taste is the spec.* The story follows a drink tracker that
became an object, because every build was measured against one person's taste
and rewritten until it passed. AI made the rewrites cheap. The taste made them
converge.

**Target artifact:** a case-study page on the personal site, about 900 words
plus four images and a live link. It's not an essay about AI and not a
product pitch. It's a process note with a playable ending.

**Why this angle over the others:** "what it makes felt" (hold a vibe, not a
number) is the product's heart, but by itself it's a feature list. "How AI
changed the work" by itself is a genre piece anyone could write. Everything
this repo has that no one else's does is on record: four specs in four days,
each opening with a critique of the last build, and a design-rules file the
code had to obey. That record *is* the AI story, told through the thing it made.

## Arc

1. **A calculator nobody would open at a bar.** (May 2025 to March 2026.) It
   started as a BAC calculator: a number and a form. PR #1 refocused it on
   live tracking. It was still a web page.
2. **The pivot: "maintain."** The heart moved from *how drunk am I* to *what
   do I want tonight to feel like*. You pin a vibe, and the app times your next
   pour to hold it. Honest harm reduction, never a cop. (v1 spec, §1.)
3. **Four drafts in four days.** (June 10 to 13, 2026.) Show the sequence as
   images: the doodled tab, the receipt deck, the receipt pile, v2.2 polish.
   Each spec opens by naming what the last one got wrong: *"too web-y"*,
   *"the handwriting read as decoration, not as ink"*, seven concrete
   problems. The beat to land: the AI could redraw the whole app overnight,
   so what mattered was saying precisely *why* it was wrong.
4. **The rules that did the work.** Quote the design rules from `CLAUDE.md`.
   Nothing may look like a web element. Two fonts only: the receipt *prints*
   facts and a human *annotates* in pen. Randomness must be seeded, never
   decorative. These read like taste, but they worked as a spec: specific
   enough that a model could obey them and a reviewer could check them.
5. **The table.** (September 2026.) The receipt was always about a night out
   with friends, but one phone held everyone's tab. Now a friend scans a QR
   code and sits down: two phones, one table, peer to peer, with no server
   keeping the night. Close on the live demo link and an invitation to play it
   with someone.

## Evidence to pull when writing

| Beat | Source |
|---|---|
| Early calculator | git history before `ce12ec8`; PR #1 |
| Maintain as the heart | `docs/superpowers/specs/2026-06-10-doodled-tab-redesign-design.md` §1 |
| Four drafts | the four specs in `docs/superpowers/specs/`; Vercel previews per commit |
| Critiques, verbatim | "User feedback" openings of the v2, v2.1 and v2.2 specs |
| The rules | `CLAUDE.md` → "Design rules (user's taste — enforced)" |
| The table | PRs #3–#4; BJS-239 |

## Not in scope

- Final prose. Burooj writes it in his own voice. This file is the skeleton.
- Screenshots of each draft need the four Vercel preview deploys, or checkouts
  of the matching commits.
- No generic content system (BJS-63 constraint).
