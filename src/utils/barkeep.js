// The bar's own voice. It has seen everything, it likes you, it swears, and
// it will not flatter you. One line at a time, in black marker, chosen for
// the moment and seeded so the same moment always gets the same line.
//
// Rules of the house: short, warm, dry. R-rated is fine. It never pushes
// another drink, never mocks anyone for stopping, never jokes about driving,
// and goes quiet-serious past cut-off.

import { scatterRand } from "./scatter";

export const LINES = {
  // ── exclusive ─────────────────────────────────────────────────────────
  getHelp: [
    "call emergency services now. stay with someone.",
    "call emergency services now. no more alcohol.",
    "call emergency services now. don't stay alone.",
    "call emergency services now. have someone stay with you.",
    "call emergency services now. follow their instructions.",
  ],
  cutOff: [
    "that's you done. water. I mean it.",
    "bar's closed for you, love. sit down.",
    "nothing more tonight. not from me.",
    "water and a chair. no arguments.",
    "I've cut off better people than you. sit.",
    "you're done. I'll still like you tomorrow.",
    "last one was the last one. water now.",
    "no. (said kindly)",
    "I'm not pouring. have some water and let someone take you home.",
    "that's a wrap. snacks, water, people. go.",
    "the tap's off. fuck, you had a go though.",
    "we're done here, champ. water.",
  ],
  closing: [
    "last call. you know the drill.",
    "closing you out. don't be a stranger.",
    "that's the tab. go home safe, I mean it.",
    "settling up? water before bed.",
    "last call, sunshine.",
    "go on then. off you fuck. nicely.",
    "tab closed. the night was good. mostly.",
    "you came, you drank, you were roughly fine.",
    "paid in full. take the memory, leave the glass.",
    "see you next time. drink water. eat something.",
    "we close, we clean, we judge quietly. night.",
    "that's a wrap. text someone you love.",
    "bar's done with you. affectionately.",
    "receipt's yours. the headache's also yours.",
    "last orders went. you were lovely.",
    "home. water. lights off. go.",
    "I'll pretend I didn't see the last hour.",
    "closing time. you don't have to go home, but.",
    "we had a night. bugger off safely.",
    "thanks for the company. now piss off and sleep.",
  ],

  // ── moments ───────────────────────────────────────────────────────────
  water: [
    "water. look at you. a grown-up.",
    "a water. the sexiest thing you've done tonight.",
    "fuck yes, hydration.",
    "the liver sends its regards.",
    "water on the house. always.",
    "tomorrow-you just blew you a kiss.",
    "that's the move. that's always the move.",
    "water: still undefeated.",
    "a sip of restraint. love to see it.",
    "good. one for every pour and I'll marry you.",
    "a tall glass of not-being-a-mess.",
    "quiet little hero, that one.",
    "nothing happens on the chart. that's the point.",
    "cheers to the water. no, really.",
    "this is the drink your mum would pour.",
    "you'll thank you at 7am. I'll thank you now.",
    "wet, cold, free. perfect drink.",
    "the glass that pays for all the others.",
    "sip that. you're doing great.",
    "pace. hydration. we love a professional.",
  ],
  firstPour: [
    "first one. the night's open.",
    "and we're off.",
    "there it is. tab's live.",
    "first one's the honest one.",
    "welcome. the lamp's on for you.",
    "right. let's see what kind of night this is.",
    "one down. no plans. good.",
    "the first sip never lies. enjoy it.",
    "the paper's clean. let's keep it tidy-ish.",
    "a start. a good start, even.",
    "pull up a stool. you're on the tab now.",
    "the only pour that doesn't need a reason.",
  ],
  milestone: [
    "that's {pours}. just saying.",
    "{pours} pours. I'm not judging. I'm counting.",
    "{pours}. the paper's filling up.",
    "pour number {pours}. a round number. a rounded you.",
    "{pours} in. still upright. respect.",
    "{pours}. the tally's getting proud of itself.",
    "we hit {pours}. no prize. maybe a water.",
    "{pours} pours, and the night's still young. unlike you.",
    "{pours}. not a record. not nothing.",
    "that's {pours}. the chart has opinions.",
    "{pours}. I've stopped pretending not to notice.",
    "{pours}. someone draw a crown on this.",
  ],

  // ── pace ──────────────────────────────────────────────────────────────
  slowDown: [
    "oi. slower.",
    "ease off, sunshine.",
    "the chart's climbing faster than you are.",
    "sip. don't gulp. we've talked about this.",
    "slow down. the drinks aren't going anywhere.",
    "pump the brakes, legend.",
    "bit quick, that. let it land.",
    "you're ahead of the clock. let it catch up.",
    "the next one can wait. so can you.",
    "I'm saying this with love: fucking slow down.",
    "the glass will still be there. the floor might not.",
    "less pouring, more talking. you're good at talking.",
    "we're not racing. nobody's racing.",
    "the curve's going up like a bad idea.",
    "give the liver a minute. it's doing its best.",
    "take a lap. have a water. come back.",
    "you don't have to drink every drink you see.",
    "steady. the night's long and you're not.",
    "cool it. I like you upright.",
    "that pace is a sprint. this is a pub crawl.",
  ],
  easyNow: [
    "easy now. you're in the good bit.",
    "nice and steady. that's the trick.",
    "you're at the top of the hill. enjoy the view.",
    "this is the sweet spot. don't blow past it.",
    "gently does it.",
    "hold here a while. it's nice here.",
    "pause here. have a water. let the clock catch up.",
    "you've got a nice glow on. keep it a glow.",
    "right about now, a water looks good on you.",
    "stay a while at this level. it suits you.",
    "the line's close to the dotted one. just so you know.",
    "easy. everything's funnier from here anyway.",
  ],
  onPace: [
    "on pace. boring. perfect.",
    "look at you, pacing like a pro.",
    "steady hand. steady chart.",
    "this is what a good night looks like on paper.",
    "pacing yourself. the bar is quietly proud.",
    "you've done this before, haven't you.",
    "measured. unlike most people in here.",
    "the chart's a nice gentle slope. keep it.",
    "textbook. if there were a textbook.",
    "whatever you're doing, keep doing it.",
    "on pace. I owe you nothing but respect.",
    "a sensible adult walks into a bar. you, apparently.",
  ],

  // ── what's in the glass ───────────────────────────────────────────────
  mixing: [
    "beer, wine, spirits… you're building a cocktail in there.",
    "mixing, are we. brave.",
    "that's a lot of different bottles for one stomach.",
    "grape and grain. the old rhyme exists for a reason.",
    "the liver didn't sign up for a tasting menu.",
    "you're a one-person wedding bar tonight.",
    "every bottle on the shelf wants a go, apparently.",
    "mixing it up. tomorrow will have notes.",
    "variety is the spice. also the headache.",
    "the ledger reads like a dare.",
  ],
  shots: [
    "a shot. of course it was a shot.",
    "shots: the drink for people who've stopped tasting.",
    "that one went down like a decision.",
    "a shot. bold. tiny. consequential.",
    "shots are just drinking in a hurry.",
    "the little glass with the big opinions.",
    "forty percent. that's not a drink, that's a plot twist.",
    "a shot. the night just changed gears.",
    "neat. fast. regrettable in about an hour.",
    "shots. so we're doing that now.",
    "that was a shot. the chart felt it.",
    "you drank the whole personality at once.",
  ],
  beer: [
    "a beer. honest work.",
    "pint. classic. nothing to see here.",
    "beer. the slow boat. good choice.",
    "a cold one. the bar approves.",
    "beer's the long game. play it.",
    "sessionable. that's the word. remember the word.",
    "a pint's a pint. a pint's also 355ml of time.",
    "beer. the drink that forgives.",
    "lager, bitter, whatever. it's a hug in a glass.",
    "a beer. you're basically hydrating. (you are not.)",
  ],
  wine: [
    "wine. fancy.",
    "a glass of wine. you've got candles at home, haven't you.",
    "wine. sip it. don't drink it like it owes you money.",
    "the sophisticated choice. the sneaky one too.",
    "wine goes down like conversation. watch it.",
    "a wine. the first glass is a mood; the third is a monologue.",
    "grape juice with ambition.",
    "that's a 12% chat right there.",
    "wine o'clock. it's always wine o'clock for someone.",
    "red, white, doesn't matter. it's all teeth by midnight.",
  ],
  cocktail: [
    "a cocktail. somebody's feeling cute.",
    "fruit, umbrella, 15%. the trojan horse of drinks.",
    "cocktails: strong things pretending to be nice things.",
    "that's a drink with a hat on.",
    "sweet going in. we'll see.",
    "a cocktail. you've got a playlist for this, haven't you.",
    "mixed drinks are how sensible people get ambushed.",
    "fancy. the chart doesn't care about garnish.",
    "the shaker's been busy. so's your liver.",
    "an actual cocktail. look at us.",
  ],
  house: [
    "a house special. the bar's flattered.",
    "your own recipe. ambitious.",
    "a drink you named yourself. this says a lot.",
    "the house special: nobody knows what's in it.",
    "an off-menu order. respect, and concern.",
    "you wrote that on a napkin. it counts.",
    "a custom pour. the ledger's honoured.",
    "mystery drink. the chart will tell us what it was.",
  ],

  // ── how you're feeling ────────────────────────────────────────────────
  sober: [
    "stone cold sober. you can leave whenever.",
    "nothing in the tank. the lamp's still nice though.",
    "sober as a judge. a nice judge.",
    "you don't have to drink, you know. I'm just here.",
    "clear-headed. rare in here. welcome.",
    "the chart's flat. flat's fine.",
    "you're the designated adult tonight. thank you.",
    "nothing to report. love nothing to report.",
    "a sober face at the bar. sit, stay, talk.",
    "no estimate to speak of. have a crisp.",
  ],
  barely: [
    "barely there. a whisper of a drink.",
    "that's a warm cheek, not a buzz.",
    "a gentle start. the night's got patience.",
    "you're at 'slightly more charming'.",
    "a touch. a hint. a suggestion.",
    "that's the first floor of a tall building.",
    "barely noticeable. I noticed.",
    "warm, not wobbly. nice place to be.",
    "you've got the colour. not the volume.",
    "this is where the good decisions live.",
  ],
  relaxed: [
    "relaxed. this is the whole point.",
    "the glow's on. don't chase it.",
    "shoulders down, voice up. you're relaxed.",
    "this is where I'd stay if I were you.",
    "this is the nice bit. hold it.",
    "you're funnier now. not by much.",
    "relaxed. the sweet spot. the actual sweet spot.",
    "warm all the way through. like toast.",
    "right here is where the night peaks, if you're clever.",
    "pleasant. that's the word. pleasant.",
    "conversation's flowing. so's the tab.",
    "loose shoulders, tight ledger. that's the dream.",
  ],
  tipsy: [
    "tipsy. properly. the laugh's gone up a notch.",
    "you're tipsy and you know it. clap your hands.",
    "the edges have gone soft. so have you.",
    "that's a buzz. a real one.",
    "tipsy. your texts are about to get interesting.",
    "the chart says tipsy. your face says tipsy.",
    "everything's a bit funnier. everything's a bit louder.",
    "you've started touching people's arms when you talk.",
    "tipsy. this is the summit for most sane people.",
    "a good tipsy. a wholesome tipsy. so far.",
    "you're at the 'I love you guys' level.",
    "there's a wobble in the handwriting. I can tell.",
  ],
  loose: [
    "loose. the filter's gone for a smoke.",
    "you're loose. say less. literally, say less.",
    "the inhibitions have left the building.",
    "loose. bold. slightly too honest.",
    "you just told someone a secret, didn't you.",
    "the dance floor's starting to look like a good idea.",
    "loose. your volume knob fell off.",
    "this is where you text your ex. don't.",
    "you're at the level where everyone's gorgeous.",
    "loose. still fun. the line's right there though.",
    "you've started doing bits. the bits are okay.",
    "hands are doing a lot of the talking now.",
    "loose as a goose. a goose that should have a water.",
    "confidence is up. accuracy is down.",
  ],
  drunk: [
    "that's drunk. no two ways about it.",
    "drunk. the ideas feel brilliant. they're not.",
    "you're drunk. lovely, but drunk.",
    "the volume is up and the aim is off.",
    "drunk. kindly stop climbing.",
    "you're explaining something with your whole body.",
    "drunk. a water now would be a plot twist.",
    "the thoughts are coming out before they're finished.",
    "you've reached 'I could totally do that'. you couldn't.",
    "drunk. good drunk, still. keep it good.",
    "the chart's up where the dotted line can't help you.",
    "a bit pissed. said with affection.",
  ],
  wasted: [
    "wasted. we're done going up now.",
    "that's wasted. sit down for a bit.",
    "you're wasted. water, and a friend, please.",
    "wasted. the floor's closer than you think.",
    "you've gone past fun into legend. legends drink water.",
    "that's enough climbing. find a chair.",
    "wasted. tomorrow's going to have questions.",
    "you're very drunk and very loved. water.",
    "the handwriting's gone. so has the plan.",
    "wasted. no more rounds. eat something.",
    "you've hit the bit nobody remembers. slow right down.",
    "that's a lot. stay with your people.",
  ],
  gone: [
    "you're gone, love. no more. water and a chair.",
    "that's past the line. sit down with someone.",
    "memory's not recording now. stop here.",
    "no more. stay with your friends. water.",
    "we're in the bit you won't remember. end it kindly.",
    "gone. sit. sip. let someone look after you.",
  ],

  // ── the shape of the night ────────────────────────────────────────────
  comingDown: [
    "coming down. the gentle part.",
    "the curve's easing. let it.",
    "you're on the way down. nice and slow.",
    "landing gear's out. let it glide.",
    "coming down. this is where water does the real work.",
    "the buzz is leaving politely. let it.",
    "easing off. a snack would be a kindness right now.",
    "the chart's sloping home. follow it.",
    "dissipating. that's the word. it's dissipating.",
    "you're sobering up. no need to fix that.",
    "the night's exhaling. breathe with it.",
    "coming down's underrated. enjoy the quiet bit.",
    "the glow's fading into something comfier.",
    "down we go. slowly. like a decent person.",
  ],
  holding: [
    "holding it. that's craft.",
    "you circled a level and you're on it. who are you.",
    "holding steady. the bar is impressed, quietly.",
    "that's a held level. that takes restraint.",
    "level held. that's the hardest trick in here.",
    "you said 'this much' and meant it. rare.",
    "steady as a held note. nicely done.",
    "the band on the chart's doing its job. so are you.",
    "holding. most people can't. you can. don't get smug.",
    "the vibe's pinned and you're sitting right on it.",
  ],

  // ── time of night ─────────────────────────────────────────────────────
  early: [
    "bit early, isn't it. no judgement. some judgement.",
    "daylight drinking. bold.",
    "the sun's still up. so are your standards, hopefully.",
    "early doors. pace yourself. it's a long way to midnight.",
    "afternoon pint energy. respect.",
    "it's early. plenty of night to not ruin.",
    "the lamp's barely needed yet.",
    "starting early means finishing early. that's the deal.",
  ],
  lateNight: [
    "it's late. the good decisions have gone home.",
    "past eleven. everything from here is a story.",
    "late o'clock. mind how you go.",
    "it's gone late. the kebab shop can smell you.",
    "late. the night's loose and so's everyone in it.",
    "midnight-ish. a water wouldn't hurt.",
    "the hour where chips become a religion.",
    "it's late and you're still here. so am I. fine.",
    "the lamp's doing the heavy lifting now.",
    "late. text someone you'll see tomorrow.",
  ],
  smallHours: [
    "small hours. the bar's being generous keeping the light on.",
    "it's properly late. this is bonus time.",
    "two in the morning is a place, not a time.",
    "the small hours. your bed's filing a complaint.",
    "nobody's ever improved a night after 2am.",
    "late late. the kind of late that becomes early.",
    "you're drinking with the dishwasher now.",
    "small hours. even the lamp's yawning.",
    "the night has nothing left to give you. go home happy.",
    "this is the hour of brilliant ideas. write none down.",
  ],
  morning: [
    "morning. either very late or very early. both bad.",
    "it's morning. the birds are judging you.",
    "a morning drink. the bar has questions.",
    "daylight's back and you're still on the tab. brave.",
    "morning. water, toast, bed. in that order.",
    "either you never left or you came back. respect, concern.",
  ],

  // ── about you ─────────────────────────────────────────────────────────
  name: [
    "alright, {name}.",
    "{name}. you again.",
    "{initials}. carved on the bar by now.",
    "{name}, mate. you're doing fine.",
    "{name}'s tab. a document of some integrity.",
    "I've poured for worse than you, {name}.",
    "{name}. good to have you back on the stool.",
    "{initials} — I'd know that handwriting anywhere.",
    "{name}, you absolute fixture.",
    "this is {name}'s night. says so on the paper.",
    "{name}. drink water. I only say it to the ones I like.",
    "{initials}, you beauty.",
  ],

  // ── banter ────────────────────────────────────────────────────────────
  banter: [
    "the lamp's on. the bar's open. the rest is yours.",
    "I've seen worse. I've seen you, before.",
    "pour kind, tip well, go home safe.",
    "nobody's keeping score. I am, a bit.",
    "this paper's seen things.",
    "the chart doesn't lie. people do. drink water.",
    "receipt paper: the only honest thing in a bar.",
    "I'm a bar. I write on receipts. we all have hobbies.",
    "your friends drew on this. I live with it.",
    "everything in moderation, including this advice.",
    "there's a water with your name on it. metaphorically. literally if you ask.",
    "I'd tell you a joke but the ledger already is one.",
    "ink, paper, booze. civilisation.",
    "a bar's just a long table with better lighting.",
    "whatever you're laughing at, keep going.",
    "the oak remembers every ring. so do I.",
    "estimates only. the hangover is exact.",
    "you look good under this lamp. everyone does. that's the lamp.",
    "the night's a tab. keep it one you'd sign.",
    "I don't do rounds. I do receipts.",
    "friends who scribble on your receipt are keepers.",
    "sip, chat, repeat. that's the whole recipe.",
    "I've got nothing. have a water anyway.",
    "the best drink in here is the one you don't need yet.",
    "a bar is a place you leave better than you arrived. in theory.",
    "the dot matrix is the printer. the scrawl is me. the mess is you.",
    "half the lines on this paper are mine. I'm fine with that.",
    "I don't pour. I remark. you'd be amazed what remarking does.",
    "the good nights don't need a reason. the bad ones have one.",
    "no amber on the paper. house rules.",
    "there's a smiley on your tab. you earned it, apparently.",
    "I keep the lights low so nobody checks the time.",
    "one lamp, one table, a dozen bad ideas. welcome.",
    "it's all a bit much, isn't it. have a sit.",
    "the thermal paper fades. the ring stains don't.",
    "you're on tab №{tab}. it's a lovely number.",
  ],
};

const EXCLUSIVE = ["getHelp", "cutOff", "closing"];

export const TOPICS = Object.keys(LINES);

const MILESTONES = new Set([3, 5, 7, 10, 12, 15, 20]);

const STATE_TOPIC = {
  Sober: "sober",
  "Barely Noticeable": "barely",
  "Pleasantly Relaxed": "relaxed",
  "Definitely Tipsy": "tipsy",
  "Inhibitions Gone": "loose",
  "Feeling Confident": "drunk",
  Overconfident: "wasted",
  "Memory Blanks": "gone",
  "Danger Zone": "gone",
  "Life Threatening": "gone",
};

const DRINK_TOPIC = { beer: "beer", wine: "wine", cocktail: "cocktail", shot: "shots" };

/**
 * Which topics apply right now, and how loudly. Pure. Returns
 * [[topic, weight], ...] with exclusive topics alone when they fire.
 *
 * ctx (all optional; everything bucketed by the caller so this is cheap):
 *   pours, waters, lastType ('beer'|'wine'|'cocktail'|'shot'|'water'|other),
 *   lastIsCustom, sinceLastMin, types (distinct alcoholic types poured),
 *   verdict, state (feeling state name), bac, pinned, hour (0–23),
 *   name, closing, falling (bac lower than a while ago)
 */
export function barTopics(ctx) {
  const { pours = 0, sinceLastMin = Infinity, verdict = "ON PACE", state = "Sober", bac = 0, hour = 21 } = ctx;
  if (bac >= 0.35) return [["getHelp", 1]];
  if (verdict === "CUT OFF" || bac >= 0.25) return [["cutOff", 1]];
  if (ctx.closing) return [["closing", 1]];

  const w = [];
  const fresh = sinceLastMin < 12;
  if ((ctx.lastIsSoft ?? (ctx.lastType === "water" && !ctx.lastIsCustom)) && fresh) w.push(["water", 6]);
  if (pours === 1 && fresh && !(ctx.lastIsSoft ?? (ctx.lastType === "water" && !ctx.lastIsCustom))) w.push(["firstPour", 6]);
  if (MILESTONES.has(pours) && fresh && !(ctx.lastIsSoft ?? (ctx.lastType === "water" && !ctx.lastIsCustom))) w.push(["milestone", 5]);

  if (verdict === "SLOW DOWN") w.push(["slowDown", 5]);
  else if (verdict === "EASY NOW") w.push(["easyNow", 3]);
  else if (pours >= 2) w.push(["onPace", 2]);

  if ((ctx.types?.length ?? 0) >= 3) w.push(["mixing", 3]);
  if (ctx.lastType && !(ctx.lastIsSoft ?? (ctx.lastType === "water" && !ctx.lastIsCustom))) {
    if (ctx.lastIsCustom) w.push(["house", 2]);
    else if (DRINK_TOPIC[ctx.lastType]) w.push([DRINK_TOPIC[ctx.lastType], ctx.lastType === "shot" ? 3 : 2]);
  }

  const stateTopic = STATE_TOPIC[state] ?? "sober";
  w.push([stateTopic, 3]);
  if (ctx.falling && sinceLastMin >= 45 && bac > 0.02) w.push(["comingDown", 4]);
  if (ctx.pinned && verdict === "ON PACE" && pours >= 2) w.push(["holding", 3]);

  if (hour >= 23 || hour < 1) w.push(["lateNight", 2]);
  else if (hour >= 1 && hour < 5) w.push(["smallHours", 2]);
  else if (hour >= 5 && hour < 11) w.push(["morning", 2]);
  else if (hour < 19) w.push(["early", 2]);

  if (ctx.name?.trim()) w.push(["name", 1.5]);
  w.push(["banter", 1]);
  return w;
}

const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 3)
    .toUpperCase();

export function fillLine(text, ctx) {
  return text
    .replaceAll("{name}", ctx.name?.trim() || "you")
    .replaceAll("{initials}", initialsOf(ctx.name) || "you")
    .replaceAll("{pours}", String(ctx.pours ?? 0))
    .replaceAll("{tab}", String(ctx.tab ?? "0000"));
}

/**
 * One line from the bar for this moment. `seed` should change only when the
 * moment does (a pour, a verdict, a new hour) — build it from buckets, never
 * from the live estimate.
 */
export function barLine(ctx, seed) {
  const topics = barTopics(ctx);
  const rand = scatterRand(`bar:${seed}`);
  const total = topics.reduce((s, [, k]) => s + k, 0);
  let roll = rand() * total;
  let topic = topics[0][0];
  for (const [t, k] of topics) {
    roll -= k;
    if (roll <= 0) {
      topic = t;
      break;
    }
  }
  const lines = LINES[topic];
  const text = fillLine(lines[Math.floor(rand() * lines.length)], ctx);
  return { topic, text, exclusive: EXCLUSIVE.includes(topic) };
}
