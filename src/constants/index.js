// Widmark formula constants
export const BAC_CONSTANTS = {
  METABOLIC_RATE: 0.015, // BAC reduction per hour (Widmark elimination rate)
  SAFE_LIMIT: 0.08, // Legal driving limit in most jurisdictions
  GENDER_CONSTANTS: {
    male: 0.68, // Male body water constant (Widmark r-value)
    female: 0.55, // Female body water constant (Widmark r-value)
  },
};

// Ink tones a person can claim for their line/avatar.
// Amber is reserved for the dark table chrome — it's too pale to read as pen
// on the cream paper, so it's not a selectable ink.
export const PERSON_COLORS = ["#C7521F", "#8C9A54", "#2B3A8F", "#B85C7A"];

export const DRINKS = [
  { type: "beer", abv: 0.05, volume: 12 },
  { type: "wine", abv: 0.12, volume: 5 },
  { type: "cocktail", abv: 0.15, volume: 8 },
  { type: "shot", abv: 0.4, volume: 1.5 },
];

// BAC levels and their associated effects
export const FEELING_STATES = [
  {
    state: "Sober",
    minBAC: 0,
    maxBAC: 0.01,
    description: "Normal state, no noticeable effects",
  },
  {
    state: "Barely Noticeable",
    minBAC: 0.01,
    maxBAC: 0.03,
    description: "Subtle warmth, slightly more relaxed but otherwise normal",
  },
  {
    state: "Pleasantly Relaxed",
    minBAC: 0.04,
    maxBAC: 0.06,
    description: 'Warm "glow", conversation flows easier, mild mood lift',
  },
  {
    state: "Definitely Tipsy",
    minBAC: 0.07,
    maxBAC: 0.09,
    description:
      "Full body warmth, noticeably looser, laughing more, slight buzz",
  },
  {
    state: "Inhibitions Gone",
    minBAC: 0.1,
    maxBAC: 0.12,
    description:
      "Physical coordination starting to change, filter between thoughts and speech weakening",
  },
  {
    state: "Feeling Confident",
    minBAC: 0.13,
    maxBAC: 0.15,
    description:
      "Strong buzz, thoughts seem brilliant (they aren't), possibly louder than normal",
  },
  {
    state: "Overconfident",
    minBAC: 0.16,
    maxBAC: 0.19,
    description: "Very noticeably drunk, balance affected, emotions amplified",
  },
  {
    state: "Memory Blanks",
    minBAC: 0.2,
    maxBAC: 0.25,
    description: "Stumbling, slurred speech, memory formation impaired",
  },
  {
    state: "Danger Zone",
    minBAC: 0.25,
    maxBAC: 0.35,
    description:
      "Severe impairment, risk of unconsciousness, medical attention may be needed",
  },
  {
    state: "Life Threatening",
    minBAC: 0.35,
    maxBAC: Infinity,
    description: "Risk of coma or death, immediate medical attention required",
  },
];

export const MAINTAINABLE_STATES = FEELING_STATES.filter((state) =>
  ["Barely Noticeable", "Pleasantly Relaxed", "Definitely Tipsy"].includes(
    state.state
  )
);
