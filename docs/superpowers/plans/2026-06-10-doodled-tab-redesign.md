# The Doodled Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the drink tracker as "the tab you doodled on" — full visual redesign, session/event data model, installable PWA, deployed to GitHub Pages — per `docs/superpowers/specs/2026-06-10-doodled-tab-redesign-design.md`.

**Architecture:** Logic-first: pure feeling/forecast utilities and a new event-log Pinia store are built TDD before any UI. The UI is then rebuilt bottom-up (tokens → small presentational components → composite components → App swap), with the old UI deleted in one swap task. PWA and deploy land last.

**Tech Stack:** Vue 3 (script setup), Pinia, Tailwind 3 + custom CSS tokens, Vitest, vite-plugin-pwa, @fontsource (Fraunces / Caveat / Space Mono), Vercel (branch previews + prod).

**Workflow:** all work happens on branch `redesign/doodled-tab` with a PR into `main`. Branch deploys to a Vercel preview URL for phone testing; production deploy happens after merge.

**Environment notes (read first):**
- Node ≥ 20 is required. The user's default shell resolves Node 16, which breaks Vite. Prefix every `bun run` command with: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && `
- Package manager is **Bun** (`bun install`, `bun add`, `bun run`).
- **Commit etiquette (user preference, overrides step wording):** before each commit, briefly tell the user what was done. During subagent execution the orchestrator batches this at task checkpoints.
- Dev server runs on port 5174 (`bun run dev`).
- Mid-plan note: Task 6 replaces `main.css`, so the OLD UI looks unstyled until Task 12 swaps in the new UI. Tests stay green throughout; this is expected.

**New event model (used everywhere):** a session is
`{ id, nickname, startedAt, people: [{id, name, weight, gender, color, pinnedState, active}], events: [{id, personId, type, abv, volume, timestamp}], customDrinks: [{id, type, abv, volume}] }`.
Events are append-only. `abv` is a fraction (0.05 = 5%), `volume` is US fl oz, `weight` is kg.

---

### Task 1: Repo hygiene

**Files:**
- Create: `.nvmrc`
- Modify: `package.json`, `.gitignore`
- Delete (untrack): `dist/`, all `.DS_Store`, `todo.md`, `features.md`

- [ ] **Step 1: Create `.nvmrc`**

```
22
```

- [ ] **Step 2: Update `package.json`** — add engines, drop the yarn packageManager line. Final file:

```json
{
  "name": "experience-alcohol",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run"
  },
  "dependencies": {
    "pinia": "^3.0.2",
    "vue": "^3.3.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.5.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "vite": "^5.0.0",
    "vitest": "^1.3.1"
  }
}
```

- [ ] **Step 3: Append to `.gitignore`** (only lines not already present):

```
dist
.DS_Store
```

- [ ] **Step 4: Untrack build output and junk, delete stale docs**

```bash
git rm -r --cached dist
git rm --cached .DS_Store src/.DS_Store src/components/.DS_Store public/.DS_Store 2>/dev/null || true
find . -name ".DS_Store" -not -path "./node_modules/*" -delete
git rm todo.md features.md
```

- [ ] **Step 5: Verify tests still pass**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run test:run`
Expected: 9 tests pass (2 files).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: repo hygiene — untrack dist, drop stale docs, pin node 20+"
```

---

### Task 2: Constants for the new model

**Files:**
- Modify: `src/constants/index.js`

- [ ] **Step 1: Rewrite `src/constants/index.js`** — lowercase drink types, `abv` field, person colors, drop icons and `DEFAULT_PERSON`. Keep `BAC_CONSTANTS`, `FEELING_STATES`, `MAINTAINABLE_STATES` byte-identical to today (they're correct):

```js
// Widmark formula constants
export const BAC_CONSTANTS = {
  METABOLIC_RATE: 0.015, // BAC reduction per hour (Widmark elimination rate)
  SAFE_LIMIT: 0.08, // Legal driving limit in most jurisdictions
  GENDER_CONSTANTS: {
    male: 0.68, // Male body water constant (Widmark r-value)
    female: 0.55, // Female body water constant (Widmark r-value)
  },
};

// Ink tones a person can claim for their line/avatar
export const PERSON_COLORS = ["#E8A33C", "#C7521F", "#8C9A54", "#2B3A8F", "#B85C7A"];

export const DRINKS = [
  { type: "beer", abv: 0.05, volume: 12 },
  { type: "wine", abv: 0.12, volume: 5 },
  { type: "cocktail", abv: 0.15, volume: 8 },
  { type: "shot", abv: 0.4, volume: 1.5 },
];
```

…then paste the existing `FEELING_STATES` array and `MAINTAINABLE_STATES` export from the current file **unchanged** (states "Sober" through "Life Threatening"; maintainables filter `["Barely Noticeable", "Pleasantly Relaxed", "Definitely Tipsy"]`). Delete `DEFAULT_PERSON`.

- [ ] **Step 2: Run tests — expect failures only in places that imported removed/changed constants**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run test:run`
Expected: PASS — tests don't import `DRINKS`/`DEFAULT_PERSON`. The app's old components still reference `DRINKS[].icon`/`alcoholContent` but those are deleted in Task 12; do not fix them now. (`stores/alcohol.js` imports `DEFAULT_PERSON` — temporarily re-add a `export const DEFAULT_PERSON = { name: "", weight: 78, gender: "male", color: "#8884d8", maintainTargetState: null };` line at the bottom with a `// removed in UI swap task` comment so the old store keeps loading in tests.)

- [ ] **Step 3: Commit**

```bash
git add src/constants/index.js
git commit -m "feat: constants for event model — abv drinks, person ink colors"
```

---

### Task 3: Forecast projection in bac.js (TDD)

**Files:**
- Modify: `src/utils/bac.js`, `tests/bac.spec.js`

- [ ] **Step 1: Write the failing tests** — append to `tests/bac.spec.js` inside the existing `describe`:

```js
  it("reads abv field as well as legacy alcoholContent", () => {
    const drinkTime = Date.now() - 10 * 60 * 1000;
    const history = [{ timestamp: new Date(drinkTime), abv: 0.05, volume: 12 }];
    const bac = calculateBACAtTime(history, { weight: 78, gender: "male" }, Date.now());
    expect(bac).toBeGreaterThan(0);
  });

  it("projects a declining forecast that reaches zero", () => {
    const now = Date.now();
    const history = [
      { timestamp: new Date(now - 30 * 60 * 1000), alcoholContent: 0.4, volume: 1.5 },
    ];
    const points = projectBAC(history, { weight: 78, gender: "male" }, {
      from: now,
      hours: 6,
      stepMinutes: 30,
    });
    expect(points[0].bac).toBeGreaterThan(0);
    expect(points.at(-1).bac).toBe(0);
    expect(points.length).toBeGreaterThan(2);
    expect(points.at(-1).time).toBeLessThanOrEqual(now + 6 * 60 * 60 * 1000);
  });
```

Also add `projectBAC` to the import list at the top of the test file.

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run test:run`
Expected: FAIL — `projectBAC` is not exported.

- [ ] **Step 3: Implement** — in `src/utils/bac.js`, inside `calculateBACAtTime`'s loop replace `drink.alcoholContent` with an abv fallback, and append `projectBAC`:

```js
    // inside the for-loop of calculateBACAtTime:
    const initial = calculateSingleDrinkBAC(
      person.weight,
      person.gender,
      drink.abv ?? drink.alcoholContent,
      drink.volume
    );
```

```js
/**
 * Project the BAC curve forward from a point in time (pure decay forecast).
 * Returns [{ time, bac }], stopping early once the curve hits zero.
 */
export function projectBAC(
  drinkHistory = [],
  person,
  { from = Date.now(), hours = 3, stepMinutes = 10 } = {}
) {
  const points = [];
  const stepMs = stepMinutes * 60 * 1000;
  const end = from + hours * 60 * 60 * 1000;

  for (let time = from; time <= end; time += stepMs) {
    const bac = calculateBACAtTime(drinkHistory, person, time);
    points.push({ time, bac });
    if (bac === 0 && time > from) break;
  }
  return points;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run test:run`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/bac.js tests/bac.spec.js
git commit -m "feat: BAC forecast projection + abv field support"
```

---

### Task 4: Feelings/stamps/pour-timing utility (TDD)

**Files:**
- Create: `src/utils/feelings.js`, `tests/feelings.spec.js`

- [ ] **Step 1: Write the failing tests** — `tests/feelings.spec.js`:

```js
import { describe, expect, it } from "vitest";
import {
  CUTOFF_BAC,
  feelingFor,
  nextPourMinutes,
  stampFor,
  targetDetails,
} from "../src/utils/feelings";

describe("feelings", () => {
  it("maps BAC to feeling states", () => {
    expect(feelingFor(0).state).toBe("Sober");
    expect(feelingFor(0.05).state).toBe("Pleasantly Relaxed");
    expect(feelingFor(0.08).state).toBe("Definitely Tipsy");
    expect(feelingFor(0.4).state).toBe("Life Threatening");
  });

  it("resolves maintainable target details by name", () => {
    expect(targetDetails("Pleasantly Relaxed").maxBAC).toBe(0.06);
    expect(targetDetails("Life Threatening")).toBeNull();
    expect(targetDetails(null)).toBeNull();
  });

  it("stamps ON PACE inside a pinned target range", () => {
    expect(stampFor(0.05, "Pleasantly Relaxed")).toBe("ON PACE");
  });

  it("stamps EASY NOW slightly above target and SLOW DOWN well above", () => {
    expect(stampFor(0.08, "Pleasantly Relaxed")).toBe("EASY NOW");
    expect(stampFor(0.12, "Pleasantly Relaxed")).toBe("SLOW DOWN");
  });

  it("grades unpinned nights on absolute thresholds", () => {
    expect(stampFor(0.03)).toBe("ON PACE");
    expect(stampFor(0.07)).toBe("EASY NOW");
    expect(stampFor(0.15)).toBe("SLOW DOWN");
  });

  it("stamps CUT OFF at high BAC regardless of target", () => {
    expect(stampFor(CUTOFF_BAC, "Definitely Tipsy")).toBe("CUT OFF");
    expect(stampFor(0.3)).toBe("CUT OFF");
  });

  it("returns null pour time at cutoff", () => {
    const person = { weight: 78, gender: "male" };
    expect(nextPourMinutes(0.3, person, { abv: 0.05, volume: 12 })).toBeNull();
  });

  it("asks for a wait when the next drink would overshoot the pinned vibe", () => {
    const person = { weight: 78, gender: "male" };
    const minutes = nextPourMinutes(0.06, person, { abv: 0.05, volume: 12 }, "Pleasantly Relaxed");
    expect(minutes).toBeGreaterThan(0);
  });

  it("allows an immediate pour when sober", () => {
    const person = { weight: 78, gender: "male" };
    expect(nextPourMinutes(0, person, { abv: 0.05, volume: 12 })).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run test:run`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/utils/feelings.js`:**

```js
// Feeling states, stamp verdicts, and pour timing — the maintain engine.

import { BAC_CONSTANTS, FEELING_STATES, MAINTAINABLE_STATES } from "../constants";
import { calculateSingleDrinkBAC, calculateTimeUntilNextDrink } from "./bac";

// Above this estimate the app stops giving pour timings entirely.
export const CUTOFF_BAC = 0.25;

export function feelingFor(bac) {
  return (
    [...FEELING_STATES].reverse().find((state) => bac >= state.minBAC) ||
    FEELING_STATES[0]
  );
}

export function targetDetails(stateName) {
  if (!stateName) return null;
  return MAINTAINABLE_STATES.find((state) => state.state === stateName) || null;
}

export function stampFor(bac, pinnedState = null) {
  if (bac >= CUTOFF_BAC) return "CUT OFF";

  const target = targetDetails(pinnedState);
  if (target) {
    if (bac <= target.maxBAC) return "ON PACE";
    if (bac < target.maxBAC + 0.03) return "EASY NOW";
    return "SLOW DOWN";
  }

  if (bac < 0.06) return "ON PACE";
  if (bac < 0.1) return "EASY NOW";
  return "SLOW DOWN";
}

/**
 * Minutes until `drink` can be poured without overshooting the pinned vibe
 * (or the default limit when nothing is pinned). Null means no more tonight.
 */
export function nextPourMinutes(bac, person, drink, pinnedState = null) {
  if (bac >= CUTOFF_BAC) return null;

  const nextDrinkBAC = calculateSingleDrinkBAC(
    person.weight,
    person.gender,
    drink.abv ?? drink.alcoholContent,
    drink.volume
  );
  const target = targetDetails(pinnedState);
  const limit = target ? target.maxBAC : BAC_CONSTANTS.SAFE_LIMIT;

  return calculateTimeUntilNextDrink(bac, nextDrinkBAC, limit);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run test:run`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/feelings.js tests/feelings.spec.js
git commit -m "feat: feelings module — stamps, targets, pour timing"
```

---

### Task 5: Session store with migration (TDD)

**Files:**
- Create: `src/stores/session.js`, `tests/session-store.spec.js`

(Old `src/stores/alcohol.js` stays until Task 11 so the legacy UI keeps working.)

- [ ] **Step 1: Write the failing tests** — `tests/session-store.spec.js`:

```js
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { createPinia, setActivePinia } from "pinia";
import { useSessionStore } from "../src/stores/session";

const createStorageMock = (seed = {}) => {
  const data = new Map(Object.entries(seed));
  return {
    getItem: vi.fn((key) => (data.has(key) ? data.get(key) : null)),
    setItem: vi.fn((key, value) => data.set(key, value)),
    removeItem: vi.fn((key) => data.delete(key)),
    clear: vi.fn(() => data.clear()),
  };
};

describe("session store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    globalThis.localStorage = createStorageMock();
  });

  it("starts with one focused person and no events", () => {
    const store = useSessionStore();
    expect(store.activePeople).toHaveLength(1);
    expect(store.focusedPersonId).toBe(store.activePeople[0].id);
    expect(store.session.events).toHaveLength(0);
  });

  it("logs drinks as append-only events and persists them", async () => {
    const store = useSessionStore();
    store.logDrink(1, { type: "beer", abv: 0.05, volume: 12 });
    await nextTick();
    expect(store.eventsFor(1)).toHaveLength(1);
    const persisted = JSON.parse(globalThis.localStorage.setItem.mock.calls.at(-1)[1]);
    expect(persisted.events).toHaveLength(1);
    expect(persisted.events[0].abv).toBe(0.05);
    expect(persisted.events[0].id).toBeTruthy();
  });

  it("pins and clears a vibe", () => {
    const store = useSessionStore();
    store.pinVibe(1, "Pleasantly Relaxed");
    expect(store.person(1).pinnedState).toBe("Pleasantly Relaxed");
    store.pinVibe(1, null);
    expect(store.person(1).pinnedState).toBeNull();
  });

  it("refuses to deactivate the last active person", () => {
    const store = useSessionStore();
    expect(store.deactivatePerson(1)).toBe(false);
    store.addPerson({ name: "sam" });
    expect(store.deactivatePerson(1)).toBe(true);
    expect(store.activePeople).toHaveLength(1);
    expect(store.focusedPersonId).toBe(store.activePeople[0].id);
  });

  it("closing the tab summarises the night, clears events, keeps people", () => {
    const store = useSessionStore();
    store.logDrink(1, { type: "shot", abv: 0.4, volume: 1.5 });
    store.closeTab();
    expect(store.lastTab.summary).toHaveLength(1);
    expect(store.lastTab.summary[0].drinks).toBe(1);
    expect(store.lastTab.summary[0].peakBAC).toBeGreaterThan(0);
    expect(store.lastTab.summary[0].peakState).toBeTruthy();
    expect(store.session.events).toHaveLength(0);
    expect(store.activePeople).toHaveLength(1);
    expect(store.person(1).pinnedState).toBeNull();
  });

  it("migrates a legacy v1 session and removes the old key", () => {
    globalThis.localStorage = createStorageMock({
      "experience-alcohol:fab-layout:v1": JSON.stringify({
        people: [
          {
            id: 1,
            name: "Saved",
            weight: 82,
            gender: "male",
            color: "#B85C38",
            maintainTargetState: "Pleasantly Relaxed",
          },
        ],
        customDrinks: [{ id: "custom-1", type: "Spritz", alcoholContent: 0.08, volume: 10 }],
        liveDrinkTracking: {
          1: {
            drinkHistory: [
              { type: "Beer", alcoholContent: 0.05, volume: 12, timestamp: new Date().toISOString() },
            ],
            currentBAC: 0,
          },
        },
      }),
    });
    setActivePinia(createPinia());
    const store = useSessionStore();
    expect(store.person(1).name).toBe("Saved");
    expect(store.person(1).pinnedState).toBe("Pleasantly Relaxed");
    expect(store.eventsFor(1)).toHaveLength(1);
    expect(store.eventsFor(1)[0].abv).toBe(0.05);
    expect(store.session.customDrinks[0].abv).toBe(0.08);
    expect(globalThis.localStorage.removeItem).toHaveBeenCalledWith(
      "experience-alcohol:fab-layout:v1"
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run test:run`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/stores/session.js`:**

```js
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { MAINTAINABLE_STATES, PERSON_COLORS } from "../constants";
import { calculateBACAtTime } from "../utils/bac";
import { feelingFor } from "../utils/feelings";

const STORAGE_KEY = "experience-alcohol:session:v2";
const LEGACY_KEY = "experience-alcohol:fab-layout:v1";

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const getStorage = () => (typeof globalThis === "undefined" ? null : globalThis.localStorage ?? null);

const buildPerson = (id, overrides = {}) => ({
  id,
  name: `guest ${id}`,
  weight: 78,
  gender: "male",
  color: PERSON_COLORS[(id - 1) % PERSON_COLORS.length],
  pinnedState: null,
  active: true,
  ...overrides,
});

const createSession = (people = null) => ({
  id: uid(),
  nickname: "tonight",
  startedAt: new Date().toISOString(),
  people: people ?? [buildPerson(1, { name: "you" })],
  events: [],
  customDrinks: [],
});

const migrateLegacy = (raw) => {
  try {
    const legacy = JSON.parse(raw);
    if (!Array.isArray(legacy?.people) || !legacy.people.length) return null;

    const people = legacy.people.map((person, index) =>
      buildPerson(Number(person.id) || index + 1, {
        name: person.name || `guest ${index + 1}`,
        weight: Number(person.weight) || 78,
        gender: person.gender === "female" ? "female" : "male",
        color: PERSON_COLORS[index % PERSON_COLORS.length],
        pinnedState: person.maintainTargetState ?? null,
      })
    );
    const events = Object.entries(legacy.liveDrinkTracking ?? {}).flatMap(
      ([personId, tracking]) =>
        (tracking?.drinkHistory ?? []).map((drink) => ({
          id: uid(),
          personId: Number(personId),
          type: (drink.type || "drink").toLowerCase(),
          abv: Number(drink.alcoholContent) || 0.05,
          volume: Number(drink.volume) || 12,
          timestamp: drink.timestamp ?? new Date().toISOString(),
        }))
    );
    const customDrinks = (legacy.customDrinks ?? []).map((drink) => ({
      id: drink.id || uid(),
      type: (drink.type || "custom").toLowerCase(),
      abv: Number(drink.alcoholContent) || 0.05,
      volume: Number(drink.volume) || 12,
    }));
    const timestamps = events.map((event) => new Date(event.timestamp).getTime());

    return {
      ...createSession(people),
      events,
      customDrinks,
      startedAt: timestamps.length
        ? new Date(Math.min(...timestamps)).toISOString()
        : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

const loadSession = () => {
  const storage = getStorage();
  if (!storage) return createSession();

  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
    if (saved?.people?.length && Array.isArray(saved.events)) return saved;
  } catch {
    // corrupt v2 payload — fall through to legacy/fresh
  }

  const legacyRaw = storage.getItem(LEGACY_KEY);
  if (legacyRaw) {
    const migrated = migrateLegacy(legacyRaw);
    if (migrated) {
      storage.removeItem(LEGACY_KEY);
      return migrated;
    }
  }
  return createSession();
};

export const useSessionStore = defineStore("session", () => {
  const session = ref(loadSession());
  const focusedPersonId = ref(session.value.people.find((p) => p.active)?.id ?? 1);
  const lastTab = ref(null);

  const activePeople = computed(() => session.value.people.filter((p) => p.active));

  const person = (id) => session.value.people.find((p) => p.id === id) ?? null;
  const eventsFor = (personId) =>
    session.value.events
      .filter((event) => event.personId === personId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  function addPerson(overrides = {}) {
    const id = Math.max(0, ...session.value.people.map((p) => p.id)) + 1;
    session.value.people.push(buildPerson(id, overrides));
    focusedPersonId.value = id;
    return id;
  }

  function updatePerson(id, updates) {
    const target = person(id);
    if (target) Object.assign(target, updates, { id });
  }

  function deactivatePerson(id) {
    if (activePeople.value.length <= 1) return false;
    const target = person(id);
    if (!target) return false;
    target.active = false;
    if (focusedPersonId.value === id) focusedPersonId.value = activePeople.value[0].id;
    return true;
  }

  function setFocus(id) {
    if (person(id)?.active) focusedPersonId.value = id;
  }

  function pinVibe(personId, stateName) {
    const target = person(personId);
    if (!target) return;
    target.pinnedState = MAINTAINABLE_STATES.some((s) => s.state === stateName)
      ? stateName
      : null;
  }

  function logDrink(personId, drink) {
    if (!person(personId)) return;
    session.value.events.push({
      id: uid(),
      personId,
      type: drink.type,
      abv: drink.abv ?? drink.alcoholContent,
      volume: drink.volume,
      timestamp: new Date().toISOString(),
    });
  }

  function addCustomDrink(drink) {
    session.value.customDrinks.push({
      id: uid(),
      type: drink.type,
      abv: drink.abv,
      volume: drink.volume,
    });
  }

  function closeTab() {
    const closedAt = new Date().toISOString();
    const summary = session.value.people
      .map((p) => {
        const events = eventsFor(p.id);
        if (!events.length) return null;
        // BAC peaks just after a pour, so sampling each pour finds the night's peak
        const peakBAC = Math.max(
          ...events.map((event) =>
            calculateBACAtTime(events, p, new Date(event.timestamp).getTime() + 1000)
          )
        );
        return {
          name: p.name,
          drinks: events.length,
          peakBAC,
          peakState: feelingFor(peakBAC).state,
        };
      })
      .filter(Boolean);

    lastTab.value = {
      nickname: session.value.nickname,
      startedAt: session.value.startedAt,
      closedAt,
      summary,
    };

    const carryOver = activePeople.value.map((p) => ({ ...p, pinnedState: null }));
    session.value = createSession(carryOver);
    focusedPersonId.value = carryOver[0]?.id ?? 1;
  }

  function dismissLastTab() {
    lastTab.value = null;
  }

  watch(
    session,
    () => {
      const storage = getStorage();
      if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(session.value));
    },
    { deep: true }
  );

  return {
    session,
    focusedPersonId,
    lastTab,
    activePeople,
    person,
    eventsFor,
    addPerson,
    updatePerson,
    deactivatePerson,
    setFocus,
    pinVibe,
    logDrink,
    addCustomDrink,
    closeTab,
    dismissLastTab,
  };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run test:run`
Expected: all PASS (old + new suites).

- [ ] **Step 5: Commit**

```bash
git add src/stores/session.js tests/session-store.spec.js
git commit -m "feat: session store — event log, vibes, close tab, v1 migration"
```

---

### Task 6: Design foundation — fonts, tokens, wobble CSS

**Files:**
- Modify: `src/assets/main.css` (full rewrite), `src/main.js`, `index.html`, `package.json` (via bun add)

- [ ] **Step 1: Install fonts**

```bash
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"
bun add @fontsource/fraunces @fontsource/caveat @fontsource/space-mono
```

- [ ] **Step 2: Import fonts in `src/main.js`** (final file):

```js
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "@fontsource/fraunces/500-italic.css";
import "@fontsource/fraunces/700-italic.css";
import "@fontsource/caveat/500.css";
import "@fontsource/caveat/700.css";
import "./assets/main.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount("#app");
```

- [ ] **Step 3: Replace `src/assets/main.css` entirely:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --paper: #fff7ec;
  --card: #fffdf7;
  --ink: #2a1b10;
  --amber: #e8a33c;
  --burnt: #c7521f;
  --pen: #2b3a8f;
  --redpen: #c92a1d;
  --faded: #9a7b54;
  --line: #ead9bc;
  --stain: rgba(232, 163, 60, 0.18);
}

@layer base {
  body {
    background: var(--paper);
    color: var(--ink);
    font-family: "Space Mono", monospace;
    -webkit-tap-highlight-color: transparent;
  }

  button {
    touch-action: manipulation;
  }
}

@layer components {
  .print {
    font-family: "Space Mono", monospace;
  }

  .announce {
    font-family: "Fraunces", Georgia, serif;
    font-style: italic;
  }

  .scribble {
    font-family: "Caveat", cursive;
  }

  .eyebrow {
    font-size: 0.6rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--burnt);
  }

  /* wobble presets — no two corners alike, assigned by position */
  .wob-a {
    border-radius: 23px 18px 26px 16px / 18px 25px 17px 26px;
  }

  .wob-b {
    border-radius: 17px 24px 15px 23px / 25px 16px 24px 18px;
  }

  .wob-c {
    border-radius: 25px 16px 22px 19px / 17px 26px 18px 23px;
  }

  .wob-d {
    border-radius: 47% 53% 51% 49% / 53% 46% 54% 47%;
  }

  .tilt-0 {
    transform: rotate(0.8deg);
  }

  .tilt-1 {
    transform: rotate(-1.7deg);
  }

  .tilt-2 {
    transform: rotate(1.2deg);
  }

  .tilt-3 {
    transform: rotate(-2.5deg);
  }

  .card {
    background: var(--card);
    border: 2px solid var(--ink);
  }

  .stain {
    position: absolute;
    border-radius: 50%;
    border: 5px solid var(--stain);
    pointer-events: none;
  }

  .stain-1 {
    top: -2.5rem;
    right: -2.8rem;
    width: 7rem;
    height: 7rem;
  }

  .stain-2 {
    top: 14rem;
    left: -3.2rem;
    width: 5.2rem;
    height: 5.2rem;
    border-width: 4px;
    transform: rotate(8deg);
  }

  .nickname-input {
    width: 100%;
    min-width: 0;
    background: transparent;
    border: none;
    border-bottom: 2px dashed transparent;
    font-size: 1.45rem;
    line-height: 1.2;
    color: var(--ink);
    outline: none;
  }

  .nickname-input:focus {
    border-bottom-color: var(--line);
  }

  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.4rem;
    height: 2.4rem;
    margin-left: -0.45rem;
    border: 2px solid var(--ink);
    border-radius: 48% 52% 50% 50% / 52% 47% 53% 48%;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--ink);
  }

  .avatar--focused {
    width: 2.8rem;
    height: 2.8rem;
    z-index: 2;
    box-shadow: 3px 3px 0 var(--ink);
  }

  .avatar--add {
    background: var(--paper);
    border-style: dashed;
    color: var(--faded);
  }

  .feeling-word {
    font-size: clamp(2rem, 9vw, 2.6rem);
    font-weight: 700;
    line-height: 0.95;
  }

  .stamp {
    display: inline-block;
    border: 3px solid currentColor;
    border-radius: 7px 9px 6px 10px / 9px 6px 10px 7px;
    padding: 1px 9px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.12em;
  }

  .stamp--ink {
    color: var(--burnt);
    background: transparent;
  }

  .field {
    width: 100%;
    min-height: 2.2rem;
    border: 2px solid var(--ink);
    border-radius: 11px 14px 10px 15px / 14px 10px 15px 11px;
    background: var(--card);
    padding: 0.3rem 0.55rem;
    font-size: 0.72rem;
    color: var(--ink);
    outline: none;
  }

  .field:focus {
    border-color: var(--burnt);
  }

  .field-label {
    display: block;
    font-size: 0.95rem;
    line-height: 1.1;
    color: var(--faded);
  }

  .swatch {
    width: 1.7rem;
    height: 1.7rem;
    border: 2px solid transparent;
  }

  .swatch--active {
    border-color: var(--ink);
    box-shadow: 2px 2px 0 var(--ink);
  }

  .pour-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 1;
    border: 2px solid var(--ink);
    background: var(--card);
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--ink);
    transition: transform 140ms ease, background-color 140ms ease;
  }

  .pour-button:active {
    transform: scale(0.93) rotate(-2deg);
  }

  .pour-button--ready {
    background: var(--amber);
  }

  .pour-button--own {
    background: var(--paper);
    border-style: dashed;
    color: var(--faded);
    font-size: 1rem;
    font-weight: 600;
  }

  .vibe-button {
    font-size: 1.1rem;
    line-height: 1.1;
    color: var(--pen);
  }

  .vibe-menu {
    position: absolute;
    bottom: calc(100% + 0.4rem);
    left: 0;
    z-index: 30;
    width: min(16rem, 80vw);
  }

  .vibe-option {
    display: flex;
    width: 100%;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    border-radius: 9px 12px 8px 13px / 12px 8px 13px 9px;
    padding: 0.45rem 0.55rem;
    font-size: 0.66rem;
    text-align: left;
  }

  .vibe-option:hover {
    background: var(--stain);
  }

  .receipt-dots {
    border-bottom: 2px dotted var(--line);
    transform: translateY(-3px);
  }

  .chart-tick {
    font-family: "Space Mono", monospace;
    font-size: 8px;
    fill: var(--faded);
  }

  .chart-note {
    font-family: "Caveat", cursive;
    font-size: 14px;
    fill: var(--burnt);
  }

  .keepsake {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(42, 27, 16, 0.45);
    padding: 1rem;
  }

  .bubble {
    animation: bubble-rise 2.4s ease-in infinite;
  }

  .bubble-2 {
    animation-delay: 0.7s;
  }

  .bubble-3 {
    animation-delay: 1.3s;
  }
}

@keyframes bubble-rise {
  from {
    transform: translateY(0);
    opacity: 0.85;
  }

  to {
    transform: translateY(-74px);
    opacity: 0;
  }
}

.thump-enter-active {
  animation: stamp-thump 0.3s cubic-bezier(0.2, 1.4, 0.4, 1);
}

@keyframes stamp-thump {
  from {
    transform: scale(1.7) rotate(-7deg);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 4: Update `index.html`** (final file — icon links land for real in Task 12):

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#FFF7EC" />
    <meta
      name="description"
      content="A live drink tracker that helps you hold tonight's vibe. Estimates only — never a reason to drive."
    />
    <title>Experience Alcohol — your tab</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 5: Verify build + tests** (old UI now unstyled — expected until Task 12)

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run test:run && bun run build`
Expected: tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: doodled-tab design tokens, wobble system, self-hosted fonts"
```

---

### Task 7: Small presentational components

**Files:**
- Create: `src/components/SquiggleDivider.vue`, `src/components/TallyMarks.vue`, `src/components/StampVerdict.vue`, `src/components/GlassMeter.vue`

- [ ] **Step 1: Create `src/components/SquiggleDivider.vue`:**

```vue
<script setup>
const props = defineProps({
  seed: { type: Number, default: 1 },
});

let d = "M4 4";
for (let x = 14; x <= 296; x += 10) {
  d += ` Q ${x - 5} ${(4 + Math.sin((x + props.seed * 37) / 9) * 2.6).toFixed(2)} ${x} 4`;
}
const path = d;
</script>

<template>
  <svg class="w-full" height="8" preserveAspectRatio="none" viewBox="0 0 300 8" aria-hidden="true">
    <path
      :d="path"
      fill="none"
      stroke="var(--line)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-dasharray="6 5"
    />
  </svg>
</template>
```

- [ ] **Step 2: Create `src/components/TallyMarks.vue`** (blue-ink tallies, groups of five, per-stroke jitter):

```vue
<script setup>
import { computed } from "vue";

const props = defineProps({
  count: { type: Number, required: true },
});

const strokes = computed(() => {
  const out = [];
  const groups = Math.ceil(props.count / 5);
  for (let g = 0; g < groups; g += 1) {
    const inGroup = Math.min(5, props.count - g * 5);
    const baseX = g * 26;
    for (let i = 0; i < Math.min(inGroup, 4); i += 1) {
      const x = baseX + 4 + i * 5;
      out.push({
        x1: +(x + Math.sin(g * 3 + i) * 0.8).toFixed(2),
        y1: 2 + (i % 2),
        x2: +(x - 1 + Math.cos(i) * 0.7).toFixed(2),
        y2: +(11 - (i % 2) * 0.6).toFixed(2),
      });
    }
    if (inGroup === 5) {
      out.push({ x1: baseX, y1: 9.5, x2: baseX + 21, y2: 3.5 });
    }
  }
  return out;
});

const width = computed(() => Math.max(1, Math.ceil(props.count / 5)) * 26);
</script>

<template>
  <svg
    v-if="count > 0"
    :width="width"
    height="13"
    :viewBox="`0 0 ${width} 13`"
    aria-hidden="true"
    class="mx-auto block"
  >
    <line
      v-for="(stroke, index) in strokes"
      :key="index"
      v-bind="stroke"
      stroke="var(--pen)"
      stroke-width="1.7"
      stroke-linecap="round"
    />
  </svg>
</template>
```

- [ ] **Step 3: Create `src/components/StampVerdict.vue`:**

```vue
<script setup>
import { computed } from "vue";

const props = defineProps({
  verdict: { type: String, required: true },
});

const tone = computed(() => {
  if (props.verdict === "CUT OFF") return "var(--redpen)";
  if (props.verdict === "ON PACE") return "var(--burnt)";
  return "var(--pen)";
});

const tilt = computed(
  () =>
    ({ "ON PACE": "tilt-1", "EASY NOW": "tilt-2", "SLOW DOWN": "tilt-3", "CUT OFF": "tilt-1" })[
      props.verdict
    ] || "tilt-1"
);
</script>

<template>
  <Transition name="thump" mode="out-in">
    <span :key="verdict" class="stamp print" :class="tilt" :style="{ color: tone }">
      {{ verdict }}
    </span>
  </Transition>
</template>
```

- [ ] **Step 4: Create `src/components/GlassMeter.vue`** (wobbly glass, amber fill, bubbles while climbing, red target line):

```vue
<script setup>
import { computed } from "vue";

const props = defineProps({
  bac: { type: Number, required: true },
  target: { type: Object, default: null },
  rising: { type: Boolean, default: false },
});

const uid = Math.random().toString(36).slice(2, 8);

const scaleMax = computed(() =>
  Math.max(0.12, props.bac * 1.25, (props.target?.maxBAC ?? 0) * 1.5)
);
const fillTop = computed(
  () => 100 - (Math.min(props.bac, scaleMax.value) / scaleMax.value) * 86
);
const targetY = computed(() =>
  props.target
    ? 100 - ((props.target.minBAC + props.target.maxBAC) / 2 / scaleMax.value) * 86
    : null
);
</script>

<template>
  <div>
    <svg
      viewBox="0 0 68 118"
      class="w-full"
      role="img"
      :aria-label="`Glass meter: estimated ${(bac * 100).toFixed(1)} percent of scale`"
    >
      <defs>
        <clipPath :id="`glass-${uid}`">
          <path
            d="M13 9 C 11.5 38 13 70 14.5 98 Q 15 106 24 106.5 L 44 106 Q 52.5 105.5 53 97 C 54.5 68 56 36 54 9.5 Z"
          />
        </clipPath>
      </defs>
      <g :clip-path="`url(#glass-${uid})`">
        <rect x="8" :y="fillTop" width="52" height="110" fill="var(--amber)" />
        <g v-if="rising" fill="var(--card)" opacity="0.8">
          <circle class="bubble" cx="24" cy="100" r="3" />
          <circle class="bubble bubble-2" cx="36" cy="104" r="2.2" />
          <circle class="bubble bubble-3" cx="45" cy="98" r="2.6" />
        </g>
      </g>
      <path
        d="M13 9 C 11.5 38 13 70 14.5 98 Q 15 106 24 106.5 L 44 106 Q 52.5 105.5 53 97 C 54.5 68 56 36 54 9.5"
        fill="none"
        stroke="var(--ink)"
        stroke-width="2.6"
        stroke-linecap="round"
      />
      <line x1="10" y1="8" x2="58" y2="9.5" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round" />
      <line
        v-if="targetY !== null"
        x1="6"
        :y1="targetY"
        x2="62"
        :y2="targetY + 1.5"
        stroke="var(--redpen)"
        stroke-width="1.8"
        stroke-dasharray="3 4"
        stroke-linecap="round"
      />
    </svg>
    <p
      v-if="target"
      class="scribble text-center text-[13px] leading-none tilt-3"
      style="color: var(--redpen)"
    >
      hold here!
    </p>
  </div>
</template>
```

- [ ] **Step 5: Verify the components compile**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run build`
Expected: build succeeds (components are not yet mounted; this catches syntax errors).

- [ ] **Step 6: Commit**

```bash
git add src/components/SquiggleDivider.vue src/components/TallyMarks.vue src/components/StampVerdict.vue src/components/GlassMeter.vue
git commit -m "feat: squiggle, tally, stamp, glass meter components"
```

---

### Task 8: TabHeader + PersonSlip

**Files:**
- Create: `src/components/TabHeader.vue`, `src/components/PersonSlip.vue`

- [ ] **Step 1: Create `src/components/PersonSlip.vue`:**

```vue
<script setup>
import { computed, reactive } from "vue";
import { useSessionStore } from "../stores/session";
import { PERSON_COLORS } from "../constants";
import { triggerHaptic } from "../utils/haptics";

const props = defineProps({
  person: { type: Object, default: null },
});
const emit = defineEmits(["close"]);
const store = useSessionStore();

const form = reactive({
  name: props.person?.name ?? "",
  weight: props.person?.weight ?? 78,
  gender: props.person?.gender ?? "male",
  color: props.person?.color ?? PERSON_COLORS[store.activePeople.length % PERSON_COLORS.length],
});

const canRemove = computed(() => props.person && store.activePeople.length > 1);

const save = () => {
  const name = form.name.trim();
  if (props.person) {
    store.updatePerson(props.person.id, { ...form, name: name || props.person.name });
  } else {
    store.addPerson(name ? { ...form, name } : { ...form, name: undefined });
  }
  triggerHaptic("success");
  emit("close");
};

const remove = () => {
  store.deactivatePerson(props.person.id);
  triggerHaptic("warning");
  emit("close");
};
</script>

<template>
  <div class="card wob-b p-3">
    <p class="eyebrow print">{{ person ? "edit drinker" : "new drinker" }}</p>
    <div class="mt-2 grid grid-cols-2 gap-2">
      <label class="block">
        <span class="scribble field-label">name</span>
        <input v-model="form.name" type="text" class="field print" placeholder="who?" />
      </label>
      <label class="block">
        <span class="scribble field-label">weight (kg)</span>
        <input v-model.number="form.weight" type="number" min="40" max="180" class="field print" />
      </label>
    </div>
    <label class="mt-2 block">
      <span class="scribble field-label">body constant</span>
      <select v-model="form.gender" class="field print">
        <option value="male">male (0.68)</option>
        <option value="female">female (0.55)</option>
      </select>
    </label>
    <div class="mt-2">
      <span class="scribble field-label">ink color</span>
      <div class="mt-1 flex gap-2">
        <button
          v-for="swatch in PERSON_COLORS"
          :key="swatch"
          type="button"
          class="swatch wob-d"
          :class="{ 'swatch--active': form.color === swatch }"
          :style="{ backgroundColor: swatch }"
          :aria-label="`Ink color ${swatch}`"
          @click="form.color = swatch"
        ></button>
      </div>
    </div>
    <div class="mt-3 flex items-center gap-3">
      <button type="button" class="stamp stamp--ink print tilt-2" @click="save">SAVE</button>
      <button
        type="button"
        class="print text-[11px] underline"
        style="color: var(--faded)"
        @click="emit('close')"
      >
        never mind
      </button>
      <button
        v-if="canRemove"
        type="button"
        class="print ml-auto text-[11px] underline"
        style="color: var(--redpen)"
        @click="remove"
      >
        left the bar
      </button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Create `src/components/TabHeader.vue`:**

```vue
<script setup>
import { ref } from "vue";
import { useSessionStore } from "../stores/session";
import { triggerHaptic } from "../utils/haptics";
import PersonSlip from "./PersonSlip.vue";

const store = useSessionStore();
const editingPerson = ref(null);
const addingPerson = ref(false);

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLowerCase() ?? "")
    .join("") || "?";

const tapAvatar = (person) => {
  if (store.focusedPersonId === person.id) {
    editingPerson.value = person;
    addingPerson.value = false;
  } else {
    store.setFocus(person.id);
    triggerHaptic("selection");
  }
};

const openAdd = () => {
  addingPerson.value = true;
  editingPerson.value = null;
};

const closeSlip = () => {
  addingPerson.value = false;
  editingPerson.value = null;
};
</script>

<template>
  <header>
    <p class="eyebrow print">your tab</p>
    <div class="flex items-end justify-between gap-3">
      <input
        v-model="store.session.nickname"
        class="scribble nickname-input"
        aria-label="Session nickname"
        maxlength="40"
      />
      <div class="flex shrink-0 items-center pl-2">
        <button
          v-for="(person, index) in store.activePeople"
          :key="person.id"
          type="button"
          class="avatar scribble"
          :class="[`tilt-${index % 4}`, { 'avatar--focused': person.id === store.focusedPersonId }]"
          :style="{ backgroundColor: person.color }"
          :aria-label="
            person.id === store.focusedPersonId
              ? `Edit ${person.name}`
              : `Switch to ${person.name}`
          "
          @click="tapAvatar(person)"
        >
          {{ initials(person.name) }}
        </button>
        <button
          type="button"
          class="avatar avatar--add scribble tilt-2"
          aria-label="Add person"
          @click="openAdd"
        >
          +
        </button>
      </div>
    </div>
    <p class="scribble text-[13px] leading-none" style="color: var(--faded)">
      tap your bubble twice to edit · + for a friend
    </p>
    <PersonSlip
      v-if="addingPerson || editingPerson"
      :key="editingPerson?.id ?? 'new'"
      :person="editingPerson"
      class="mt-3"
      @close="closeSlip"
    />
  </header>
</template>
```

- [ ] **Step 3: Verify build**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/TabHeader.vue src/components/PersonSlip.vue
git commit -m "feat: tab header with bubble avatars and person slip"
```

---

### Task 9: FeelingCard (the hero)

**Files:**
- Create: `src/components/FeelingCard.vue`

- [ ] **Step 1: Create `src/components/FeelingCard.vue`:**

```vue
<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime } from "../utils/bac";
import { CUTOFF_BAC, feelingFor, nextPourMinutes, stampFor, targetDetails } from "../utils/feelings";
import { DRINKS, MAINTAINABLE_STATES } from "../constants";
import { triggerHaptic } from "../utils/haptics";
import GlassMeter from "./GlassMeter.vue";
import StampVerdict from "./StampVerdict.vue";

const props = defineProps({
  person: { type: Object, required: true },
});

const store = useSessionStore();
const now = useLiveNow();
const vibeMenuOpen = ref(false);

const events = computed(() => store.eventsFor(props.person.id));
const bac = computed(() => calculateBACAtTime(events.value, props.person, now.value));
const rising = computed(
  () => bac.value > calculateBACAtTime(events.value, props.person, now.value - 60000) + 0.00001
);
const feeling = computed(() => feelingFor(bac.value));
const stamp = computed(() => stampFor(bac.value, props.person.pinnedState));
const target = computed(() => targetDetails(props.person.pinnedState));
const cutOff = computed(() => bac.value >= CUTOFF_BAC);

const pourCopy = computed(() => {
  if (cutOff.value) return "no more tonight — water + a friend keeping watch";
  const minutes = nextPourMinutes(bac.value, props.person, DRINKS[0], props.person.pinnedState);
  if (minutes <= 0) return "next pour: whenever you like";
  const at = new Date(now.value + minutes * 60000);
  const hh = at.getHours().toString().padStart(2, "0");
  const mm = at.getMinutes().toString().padStart(2, "0");
  return `next pour ok ${hh}:${mm}`;
});

const timeLabel = computed(() =>
  new Date(now.value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
);

const pinState = (stateName) => {
  store.pinVibe(props.person.id, stateName);
  vibeMenuOpen.value = false;
  triggerHaptic("selection");
};
</script>

<template>
  <section class="card wob-a relative p-4">
    <p class="eyebrow print">feeling · {{ timeLabel }}</p>
    <div class="mt-1 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 class="announce feeling-word">{{ feeling.state.toLowerCase() }}</h2>
        <svg class="-mt-1" width="110" height="12" viewBox="0 0 110 12" aria-hidden="true">
          <path
            d="M4 8 C 26 3, 60 2, 106 6 C 70 6, 28 8, 7 11"
            fill="none"
            stroke="var(--redpen)"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
        <p class="print mt-2 text-[11px] leading-4" style="color: var(--faded)">
          {{ feeling.description }}
        </p>
        <p class="print mt-3 text-lg font-bold">
          {{ bac.toFixed(3) }}%
          <span class="text-[10px] font-normal" style="color: var(--faded)">
            est. · {{ rising ? "climbing" : "drifting down" }}
          </span>
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <StampVerdict :verdict="stamp" />
          <span class="print text-[11px]">{{ pourCopy }}</span>
        </div>
      </div>
      <GlassMeter :bac="bac" :target="target" :rising="rising" class="w-[68px] shrink-0" />
    </div>

    <div class="relative mt-3">
      <button type="button" class="scribble vibe-button" @click="vibeMenuOpen = !vibeMenuOpen">
        <template v-if="!target">pin a vibe for tonight ↴</template>
        <template v-else>holding: {{ target.state.toLowerCase() }} ↴</template>
      </button>
      <div v-if="vibeMenuOpen" class="card wob-c vibe-menu p-2">
        <button
          v-for="option in MAINTAINABLE_STATES"
          :key="option.state"
          type="button"
          class="vibe-option print"
          @click="pinState(option.state)"
        >
          <span class="announce text-[0.85rem]">{{ option.state.toLowerCase() }}</span>
          <span style="color: var(--faded)">
            {{ option.minBAC.toFixed(2) }}–{{ option.maxBAC.toFixed(2) }}%
          </span>
        </button>
        <button
          v-if="target"
          type="button"
          class="vibe-option print"
          style="color: var(--redpen)"
          @click="pinState(null)"
        >
          unpin — free pour
        </button>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 2: Verify build**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/FeelingCard.vue
git commit -m "feat: feeling card — glass meter, stamp verdict, pin-the-vibe"
```

---

### Task 10: PourRow

**Files:**
- Create: `src/components/PourRow.vue`

- [ ] **Step 1: Create `src/components/PourRow.vue`:**

```vue
<script setup>
import { computed, reactive, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime } from "../utils/bac";
import { CUTOFF_BAC, nextPourMinutes } from "../utils/feelings";
import { DRINKS } from "../constants";
import { triggerHaptic } from "../utils/haptics";
import TallyMarks from "./TallyMarks.vue";

const props = defineProps({
  person: { type: Object, required: true },
});

const store = useSessionStore();
const now = useLiveNow();
const showCustomSlip = ref(false);
const customForm = reactive({ type: "", abvPercent: 8, volume: 6 });

const drinks = computed(() => [...DRINKS, ...store.session.customDrinks]);
const bac = computed(() =>
  calculateBACAtTime(store.eventsFor(props.person.id), props.person, now.value)
);

const countFor = (type) =>
  store.eventsFor(props.person.id).filter((event) => event.type === type).length;

const waitFor = (drink) => {
  if (bac.value >= CUTOFF_BAC) return null;
  return nextPourMinutes(bac.value, props.person, drink, props.person.pinnedState);
};

const waitLabel = (drink) => {
  const minutes = waitFor(drink);
  if (minutes === null) return "water";
  if (minutes <= 0) return "ready";
  return minutes < 60 ? `wait ${Math.ceil(minutes)}m` : `wait ${Math.ceil(minutes / 60)}h`;
};

const isReady = (drink) => {
  const minutes = waitFor(drink);
  return minutes !== null && minutes <= 0;
};

const pour = (drink) => {
  store.logDrink(props.person.id, drink);
  triggerHaptic("tap");
};

const saveCustom = () => {
  const name = customForm.type.trim().toLowerCase();
  if (!name) return;
  store.addCustomDrink({
    type: name,
    abv: Number(customForm.abvPercent) / 100,
    volume: Number(customForm.volume),
  });
  customForm.type = "";
  showCustomSlip.value = false;
  triggerHaptic("success");
};
</script>

<template>
  <section>
    <div class="grid grid-cols-5 gap-2">
      <div v-for="(drink, index) in drinks" :key="drink.type" class="text-center">
        <button
          type="button"
          class="pour-button announce wob-d"
          :class="[`tilt-${index % 4}`, { 'pour-button--ready': isReady(drink) }]"
          :aria-label="`Log ${drink.type} for ${person.name}`"
          @click="pour(drink)"
        >
          {{ drink.type.length > 6 ? drink.type.slice(0, 5) + "…" : drink.type }}
        </button>
        <TallyMarks :count="countFor(drink.type)" class="mt-1" />
        <p
          class="print mt-0.5 text-[9px]"
          :style="{ color: isReady(drink) ? 'var(--burnt)' : 'var(--faded)' }"
        >
          {{ waitLabel(drink) }}
        </p>
      </div>
      <div class="text-center">
        <button
          type="button"
          class="pour-button pour-button--own scribble wob-d tilt-2"
          aria-label="Add a custom drink type"
          @click="showCustomSlip = !showCustomSlip"
        >
          + own
        </button>
      </div>
    </div>

    <div v-if="showCustomSlip" class="card wob-c mt-3 p-3">
      <p class="eyebrow print">house special</p>
      <div class="mt-2 grid grid-cols-[1.4fr_1fr_1fr] gap-2">
        <input v-model="customForm.type" type="text" class="field print" placeholder="name it" />
        <input
          v-model.number="customForm.abvPercent"
          type="number"
          min="1"
          max="70"
          step="0.5"
          class="field print"
          placeholder="abv %"
        />
        <input
          v-model.number="customForm.volume"
          type="number"
          min="0.5"
          max="24"
          step="0.5"
          class="field print"
          placeholder="oz"
        />
      </div>
      <p class="scribble mt-1 text-[12px]" style="color: var(--faded)">1 oz ≈ 30 ml</p>
      <button type="button" class="stamp stamp--ink print tilt-1 mt-2" @click="saveCustom">
        ADD IT
      </button>
    </div>
  </section>
</template>
```

- [ ] **Step 2: Verify build**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/PourRow.vue
git commit -m "feat: pour row — wobbly drink buttons, tallies, house specials"
```

---

### Task 11: ReceiptLog, VibeChart, CloseTab

**Files:**
- Create: `src/components/ReceiptLog.vue`, `src/components/VibeChart.vue`, `src/components/CloseTab.vue`

- [ ] **Step 1: Create `src/components/ReceiptLog.vue`:**

```vue
<script setup>
import { computed } from "vue";
import { useSessionStore } from "../stores/session";
import { calculateSingleDrinkBAC } from "../utils/bac";
import { DRINKS } from "../constants";

const store = useSessionStore();
const DEFAULT_TYPES = new Set(DRINKS.map((drink) => drink.type));

const lines = computed(() => {
  const multiplePeople = store.session.people.filter((p) => p.active).length > 1;
  return [...store.session.events]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((event) => {
      const person = store.session.people.find((p) => p.id === event.personId);
      const delta = person
        ? calculateSingleDrinkBAC(person.weight, person.gender, event.abv, event.volume)
        : 0;
      return {
        id: event.id,
        time: new Date(event.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        label: multiplePeople && person ? `${person.name.slice(0, 4)} · ${event.type}` : event.type,
        delta: `+${delta.toFixed(3)}`,
        faded: person ? !person.active : true,
        note: DEFAULT_TYPES.has(event.type) ? null : "house special",
      };
    });
});
</script>

<template>
  <section>
    <div class="flex items-baseline justify-between">
      <p class="eyebrow print">tonight's receipt</p>
      <span class="scribble text-[13px]" style="color: var(--pen)">the damage so far →</span>
    </div>
    <p v-if="!lines.length" class="scribble mt-2 text-center text-base" style="color: var(--faded)">
      tap a drink to start your tab
    </p>
    <ul v-else class="print mt-2 space-y-1 text-[11px]">
      <li
        v-for="line in lines"
        :key="line.id"
        class="flex items-baseline gap-2"
        :style="{ opacity: line.faded ? 0.45 : 1 }"
      >
        <span style="color: var(--faded)">{{ line.time }}</span>
        <span class="uppercase">{{ line.label }}</span>
        <span class="receipt-dots flex-1" aria-hidden="true"></span>
        <span>{{ line.delta }}</span>
        <span v-if="line.note" class="scribble text-[12px]" style="color: var(--redpen)">
          {{ line.note }}
        </span>
      </li>
    </ul>
  </section>
</template>
```

- [ ] **Step 2: Create `src/components/VibeChart.vue`:**

```vue
<script setup>
import { computed } from "vue";
import { useSessionStore } from "../stores/session";
import { useLiveNow } from "../composables/useLiveNow";
import { calculateBACAtTime, projectBAC } from "../utils/bac";
import { targetDetails } from "../utils/feelings";

const store = useSessionStore();
const now = useLiveNow();

const WIDTH = 320;
const HEIGHT = 150;
const PAD = { top: 14, right: 12, bottom: 18, left: 30 };

const chart = computed(() => {
  const start = new Date(store.session.startedAt).getTime();
  const horizon = now.value + 2 * 60 * 60 * 1000;
  const people = store.activePeople;

  const series = people.map((person, index) => {
    const events = store.eventsFor(person.id);
    const past = [];
    const step = Math.max(60000, Math.floor((now.value - start) / 40) || 60000);
    for (let t = start; t < now.value; t += step) {
      past.push({ time: t, bac: calculateBACAtTime(events, person, t) });
    }
    past.push({ time: now.value, bac: calculateBACAtTime(events, person, now.value) });
    const future = projectBAC(events, person, { from: now.value, hours: 2, stepMinutes: 8 });
    return { person, index, past, future };
  });

  const maxBAC =
    Math.max(0.1, ...series.flatMap((s) => [...s.past, ...s.future].map((p) => p.bac))) * 1.15;
  const toX = (t) => PAD.left + ((t - start) / (horizon - start)) * (WIDTH - PAD.left - PAD.right);
  const toY = (bac) => HEIGHT - PAD.bottom - (bac / maxBAC) * (HEIGHT - PAD.top - PAD.bottom);
  const wobblePath = (points, seed) =>
    points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${toX(p.time).toFixed(1)} ${(toY(p.bac) + Math.sin(i * 2.1 + seed) * 1.1).toFixed(1)}`
      )
      .join(" ");

  const rendered = series.map((s) => ({
    id: s.person.id,
    color: s.person.color,
    pastPath: wobblePath(s.past, s.index * 7),
    futurePath: wobblePath([s.past.at(-1), ...s.future], s.index * 7 + 3),
    nowPoint: { x: toX(now.value), y: toY(s.past.at(-1).bac) },
    focused: s.person.id === store.focusedPersonId,
  }));

  const focusedPerson = people.find((p) => p.id === store.focusedPersonId);
  const target = focusedPerson ? targetDetails(focusedPerson.pinnedState) : null;

  return {
    rendered,
    targetY: target ? toY((target.minBAC + target.maxBAC) / 2) : null,
    ticks: [0.04, 0.08, 0.12].filter((v) => v < maxBAC).map((v) => ({ v, y: toY(v) })),
    focusedPoint: rendered.find((r) => r.focused)?.nowPoint ?? null,
  };
});
</script>

<template>
  <section>
    <p class="eyebrow print">the vibe line</p>
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="mt-1 w-full"
      role="img"
      aria-label="Estimated BAC over the night, with a dashed forecast of the next two hours"
    >
      <g v-for="tick in chart.ticks" :key="tick.v">
        <line
          :x1="PAD.left"
          :y1="tick.y"
          :x2="WIDTH - PAD.right"
          :y2="tick.y"
          stroke="var(--line)"
          stroke-width="1"
          stroke-dasharray="2 6"
        />
        <text :x="2" :y="tick.y + 3" class="chart-tick">{{ tick.v.toFixed(2) }}</text>
      </g>
      <line
        v-if="chart.targetY !== null"
        :x1="PAD.left"
        :y1="chart.targetY"
        :x2="WIDTH - PAD.right"
        :y2="chart.targetY + 2"
        stroke="var(--redpen)"
        stroke-width="1.4"
        stroke-dasharray="3 5"
      />
      <g v-for="series in chart.rendered" :key="series.id" :opacity="series.focused ? 1 : 0.4">
        <path
          :d="series.pastPath"
          fill="none"
          :stroke="series.color"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          :d="series.futurePath"
          fill="none"
          :stroke="series.color"
          stroke-width="1.8"
          stroke-dasharray="4 5"
          stroke-linecap="round"
        />
        <circle :cx="series.nowPoint.x" :cy="series.nowPoint.y" r="3.4" :fill="series.color" />
      </g>
      <text
        v-if="chart.focusedPoint"
        :x="Math.min(chart.focusedPoint.x + 6, 235)"
        :y="Math.max(chart.focusedPoint.y - 8, 12)"
        class="chart-note"
      >
        you are here
      </text>
    </svg>
  </section>
</template>
```

- [ ] **Step 3: Create `src/components/CloseTab.vue`:**

```vue
<script setup>
import { computed, ref } from "vue";
import { useSessionStore } from "../stores/session";
import { triggerHaptic } from "../utils/haptics";
import SquiggleDivider from "./SquiggleDivider.vue";

const store = useSessionStore();
const confirming = ref(false);

const hasEvents = computed(() => store.session.events.length > 0);

const close = () => {
  if (!confirming.value) {
    confirming.value = true;
    return;
  }
  store.closeTab();
  confirming.value = false;
  triggerHaptic("success");
};

const duration = (tab) => {
  const ms = new Date(tab.closedAt) - new Date(tab.startedAt);
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};
</script>

<template>
  <section>
    <div v-if="hasEvents" class="text-center">
      <button
        type="button"
        class="stamp print tilt-1"
        :style="{ color: confirming ? 'var(--redpen)' : 'var(--ink)' }"
        @click="close"
      >
        {{ confirming ? "SURE? TAP TO CLOSE" : "CLOSE TAB" }}
      </button>
      <button
        v-if="confirming"
        type="button"
        class="print mt-1 block w-full text-[10px] underline"
        style="color: var(--faded)"
        @click="confirming = false"
      >
        keep it open
      </button>
    </div>

    <div v-if="store.lastTab" class="keepsake" role="dialog" aria-label="Closed tab summary">
      <div class="card wob-a w-full max-w-sm p-4">
        <p class="eyebrow print">tab closed · {{ duration(store.lastTab) }}</p>
        <p class="scribble mt-1 text-2xl">{{ store.lastTab.nickname }}</p>
        <SquiggleDivider :seed="5" class="my-2" />
        <p v-if="!store.lastTab.summary.length" class="print text-[11px]" style="color: var(--faded)">
          a quiet one — nothing poured.
        </p>
        <div v-for="entry in store.lastTab.summary" :key="entry.name" class="print mt-2 text-[11px]">
          <p class="font-bold uppercase">{{ entry.name }}</p>
          <p style="color: var(--faded)">
            {{ entry.drinks }} drink{{ entry.drinks === 1 ? "" : "s" }} · peaked at
            <span class="announce" style="color: var(--ink)">{{ entry.peakState.toLowerCase() }}</span>
            ({{ entry.peakBAC.toFixed(3) }}%)
          </p>
        </div>
        <SquiggleDivider :seed="9" class="my-2" />
        <p class="print text-center text-[10px]" style="color: var(--faded)">
          water before bed · the management thanks you
        </p>
        <button
          type="button"
          class="stamp stamp--ink print tilt-2 mx-auto mt-3 block"
          @click="store.dismissLastTab()"
        >
          START A NEW TAB
        </button>
      </div>
    </div>
  </section>
</template>
```

- [ ] **Step 4: Verify build**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/ReceiptLog.vue src/components/VibeChart.vue src/components/CloseTab.vue
git commit -m "feat: receipt log, vibe chart with forecast, close-tab keepsake"
```

---

### Task 12: App swap — new shell, delete the old UI

**Files:**
- Modify: `src/App.vue` (full rewrite), `src/constants/index.js` (remove temp DEFAULT_PERSON)
- Delete: `src/components/LiveDrinkTracker.vue`, `src/components/SessionChart.vue`, `src/components/person/` (all 5 files), `src/composables/usedrinks.js`, `src/composables/useperson.js`, `src/stores/alcohol.js`, `tests/alcohol-store.spec.js`, `public/icons/` (4 svgs), `src/assets/bubble.svg`, `src/assets/bubbles.svg`

- [ ] **Step 1: Rewrite `src/App.vue`:**

```vue
<script setup>
import { computed } from "vue";
import { useSessionStore } from "./stores/session";
import TabHeader from "./components/TabHeader.vue";
import FeelingCard from "./components/FeelingCard.vue";
import PourRow from "./components/PourRow.vue";
import VibeChart from "./components/VibeChart.vue";
import ReceiptLog from "./components/ReceiptLog.vue";
import CloseTab from "./components/CloseTab.vue";
import SquiggleDivider from "./components/SquiggleDivider.vue";

const store = useSessionStore();
const focused = computed(() => store.person(store.focusedPersonId));
</script>

<template>
  <main class="relative mx-auto min-h-screen w-full max-w-md overflow-x-clip px-4 pb-16 pt-5">
    <div class="stain stain-1" aria-hidden="true"></div>
    <div class="stain stain-2" aria-hidden="true"></div>

    <TabHeader />

    <template v-if="focused">
      <FeelingCard :person="focused" class="mt-4" />
      <PourRow :person="focused" class="mt-4" />
    </template>

    <SquiggleDivider :seed="2" class="mt-6" />
    <VibeChart class="mt-2" />
    <ReceiptLog class="mt-5" />
    <CloseTab class="mt-6" />

    <p class="print mt-8 text-center text-[10px] leading-5" style="color: var(--faded)">
      estimates only · never a reason to drive<br />
      drink water, you animal
    </p>
  </main>
</template>
```

- [ ] **Step 2: Delete the old UI and its dependencies**

```bash
git rm src/components/LiveDrinkTracker.vue src/components/SessionChart.vue
git rm -r src/components/person
git rm src/composables/usedrinks.js src/composables/useperson.js
git rm src/stores/alcohol.js tests/alcohol-store.spec.js
git rm -r public/icons
git rm src/assets/bubble.svg src/assets/bubbles.svg
```

- [ ] **Step 3: Remove the temporary `DEFAULT_PERSON` re-export** from `src/constants/index.js` (added in Task 2 Step 2).

- [ ] **Step 4: Run tests + build**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run test:run && bun run build`
Expected: all suites pass (bac, feelings, session-store); build succeeds with no unresolved imports.

- [ ] **Step 5: Visual verification (REQUIRED — use the dev server)**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run dev` and check at 390×844 (iPhone-ish) viewport:
1. Header shows "your tab" eyebrow, editable Caveat nickname, wobbly avatar bubble(s).
2. Feeling card: "sober", glass empty, ON PACE stamp, "next pour: whenever you like".
3. Tap beer → tally stroke appears, BAC rises, glass fills, stamp may thump.
4. Pin a vibe → red dotted line + "hold here!" on glass; pour buttons show waits.
5. Add a person, switch focus via avatars, log drinks for both → receipt interleaves with initials; chart shows two wobbly lines + dashed forecasts.
6. CLOSE TAB → confirm → keepsake overlay with per-person peaks → START A NEW TAB.
7. Reload page → session persists.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: the doodled tab — new app shell, old UI removed"
```

---

### Task 13: PWA

**Files:**
- Create: `public/icon.svg`
- Modify: `vite.config.js`, `index.html`, `package.json` (via bun add)

- [ ] **Step 1: Install vite-plugin-pwa**

```bash
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"
bun add -d vite-plugin-pwa
```

- [ ] **Step 2: Create `public/icon.svg`** (doodle glass app icon):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="108" fill="#FFF7EC"/>
  <path d="M150 96 C 142 220 152 330 162 408 Q 166 444 206 446 L 306 444 Q 344 442 348 406 C 358 326 368 218 360 98 Z" fill="#E8A33C"/>
  <path d="M150 96 C 142 220 152 330 162 408 Q 166 444 206 446 L 306 444 Q 344 442 348 406 C 358 326 368 218 360 98" fill="none" stroke="#2A1B10" stroke-width="22" stroke-linecap="round"/>
  <line x1="136" y1="92" x2="376" y2="98" stroke="#2A1B10" stroke-width="20" stroke-linecap="round"/>
  <circle cx="216" cy="350" r="16" fill="#FFF7EC"/>
  <circle cx="276" cy="300" r="12" fill="#FFF7EC"/>
  <circle cx="246" cy="392" r="14" fill="#FFF7EC"/>
  <line x1="120" y1="210" x2="392" y2="218" stroke="#C92A1D" stroke-width="14" stroke-dasharray="26 22" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 3: Generate raster icons**

```bash
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"
bunx @vite-pwa/assets-generator --preset minimal-2023 public/icon.svg
```

Expected output files in `public/`: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`.

- [ ] **Step 4: Rewrite `vite.config.js`:**

```js
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "favicon.ico", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Experience Alcohol",
        short_name: "Tab",
        description: "A live drink tracker that helps you hold tonight's vibe.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#FFF7EC",
        theme_color: "#FFF7EC",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5174,
  },
});
```

- [ ] **Step 5: Add icon links to `index.html`** `<head>` (after the theme-color meta):

```html
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
```

- [ ] **Step 6: Verify build + preview**

Run: `export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" && bun run test:run && bun run build && bun run preview`
Expected: build emits `dist/sw.js` and `dist/manifest.webmanifest`; preview at `http://localhost:4173/` loads the app and DevTools → Application shows an installable manifest + registered service worker.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: installable PWA — manifest, icons, offline service worker"
```

---

### Task 14: Deploy preview to Vercel

**Files:**
- Create: `vercel.json`
- Modify: `.gitignore`

The Vercel CLI is authenticated as `beejsbj` (run via `bunx vercel` with the Node 22 PATH prefix).

- [ ] **Step 1: Create `vercel.json`** (keep the service worker fresh):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/sw.js",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    },
    {
      "source": "/manifest.webmanifest",
      "headers": [{ "key": "Content-Type", "value": "application/manifest+json" }]
    }
  ]
}
```

- [ ] **Step 2: Ignore Vercel local metadata** — append to `.gitignore`:

```
.vercel
```

- [ ] **Step 3: Link the project and deploy a preview from the branch**

```bash
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"
bunx vercel link --yes
bunx vercel deploy --yes
```

Expected: CLI prints a preview URL like `https://experience-alcohol-<hash>-beejsbj.vercel.app`. Open it, verify the app loads and the manifest/SW register. **Share this URL with the user for phone testing.**

- [ ] **Step 4: Commit**

```bash
git add vercel.json .gitignore
git commit -m "ci: vercel config for branch previews"
```

(Production deploy — `bunx vercel --prod` or Vercel Git integration — happens after the PR merges, with the user's go-ahead.)

---

### Task 15: README + final verification

**Files:**
- Modify: `README.md` (full rewrite)

- [ ] **Step 1: Rewrite `README.md`:**

```markdown
# Experience Alcohol — your tab

A live drink tracker styled as the bar tab you doodled on. Log drinks with a tap,
watch an estimated BAC drift in real time, and pin the vibe you want to hold
tonight — the app times your next pour to keep you there.

**Live:** deployed on Vercel (fill in the production URL at deploy time) —
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
```

- [ ] **Step 2: Full verification pass**

```bash
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"
bun run test:run && bun run build
```
Expected: all tests pass, clean build. Then a final dev-server walkthrough of the Task 12 Step 5 checklist.

- [ ] **Step 3: Commit and push the branch**

```bash
git add README.md
git commit -m "docs: README for the doodled tab"
git push experience-alcohol redesign/doodled-tab
```

---

## Spec coverage self-check

- Wobble system → Task 6 (CSS), Tasks 7–11 (per-element tilts/jitter)
- Three voices → Task 6 tokens + every component
- Maintain as heart (pin-the-vibe, glass target, pour windows) → Tasks 4, 9, 10
- Stamps incl. CUT OFF suppressing pour times → Tasks 4, 9, 10
- Receipt + interleaved log + greyed departed people → Task 11 (ReceiptLog)
- Hand-drawn chart + dashed forecast + target line → Tasks 3, 11 (VibeChart)
- Close tab keepsake → Tasks 5 (store), 11 (UI)
- Session/event model for future rooms + migration → Task 5
- First-run empty state → Task 11 (ReceiptLog empty copy) + Task 12 hint line
- PWA (manifest, icons, offline, self-hosted fonts) → Tasks 6, 13
- Deploy (Vercel previews + prod) → Task 14
- Repo hygiene, README, Node ≥ 20 → Tasks 1, 15
```
