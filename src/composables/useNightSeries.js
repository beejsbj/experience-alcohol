import { computed, effectScope } from "vue";
import { useSessionStore } from "../stores/session";
import { liveNow } from "./useLiveNow";
import { calculateBACAtTime, projectBAC } from "../utils/bac";

// Everyone's BAC curve for the night, sampled once and shared by every
// receipt's chart. A chart is read at a glance, so it moves on the minute —
// or straight away when someone pours — not on every tick of the clock.
const MINUTE = 60000;
let shared = null;

export function useNightSeries() {
  const store = useSessionStore();
  if (shared?.store === store) return shared.api;

  shared?.scope.stop();
  const scope = effectScope(true);
  const api = scope.run(() => {
    const minute = computed(() => Math.floor(liveNow.value / MINUTE) * MINUTE);
    // Never behind the latest pour, so a fresh one lands on the chart at once.
    const now = computed(() => {
      let latest = 0;
      for (const list of store.eventsByPerson.values()) latest = Math.max(latest, list.at(-1)?.t ?? 0);
      return Math.max(minute.value, Math.min(liveNow.value, latest + 1000));
    });

    const series = computed(() => {
      const t0 = now.value;
      const start = new Date(store.session.startedAt).getTime();
      const out = new Map();
      for (const person of store.activePeople) {
        const events = store.eventsFor(person.id);
        const step = Math.max(MINUTE, Math.floor((t0 - start) / 60) || MINUTE);
        const past = [];
        for (let t = start; t < t0; t += step) past.push({ time: t, bac: calculateBACAtTime(events, person, t) });
        // Sample either side of each pour too, so the printed steps land true.
        for (const e of events) {
          if (e.t > start && e.t < t0) {
            past.push({ time: e.t - 1, bac: calculateBACAtTime(events, person, e.t - 1) });
            past.push({ time: e.t + 1, bac: calculateBACAtTime(events, person, e.t + 1) });
          }
        }
        past.sort((a, b) => a.time - b.time);
        past.push({ time: t0, bac: calculateBACAtTime(events, person, t0) });
        const future = projectBAC(events, person, { from: t0, hours: 2, stepMinutes: 6 });
        out.set(person.id, { person, past, future });
      }
      return out;
    });

    const peak = computed(() => {
      let max = 0;
      for (const s of series.value.values()) for (const p of [...s.past, ...s.future]) max = Math.max(max, p.bac);
      return max;
    });

    return { now, series, peak };
  });

  shared = { store, scope, api };
  return api;
}
