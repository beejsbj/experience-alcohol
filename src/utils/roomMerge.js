// Deterministic merge of two copies of the same session, so any number of
// devices sharing a room converge on one table no matter what order their
// snapshots arrive in. merge(a, b) === merge(b, a), and merging twice changes
// nothing.
//
// - events and custom drinks are grow-only: union by id.
// - people are last-writer-wins per person, on `rev` ({ t, by }): newest
//   timestamp wins, device id breaks ties.
// - people sit in the order they joined the table (joinedAt, then id).
// - the session keeps the earliest start.

const byId = (lists) => {
  const map = new Map();
  for (const list of lists) for (const item of list ?? []) if (!map.has(item.id)) map.set(item.id, item);
  return [...map.values()];
};

export const compareRev = (a, b) => {
  const at = a?.t ?? 0;
  const bt = b?.t ?? 0;
  if (at !== bt) return at - bt;
  const aby = a?.by ?? "";
  const bby = b?.by ?? "";
  return aby < bby ? -1 : aby > bby ? 1 : 0;
};

const newerPerson = (a, b) => (compareRev(a.rev, b.rev) >= 0 ? a : b);

const byTime = (a, b) => {
  const d = new Date(a.timestamp) - new Date(b.timestamp);
  return d || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
};

const idOrder = (a, b) => (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0);

export function mergeSessions(local, remote) {
  if (!remote) return local;
  if (!local) return remote;

  const people = new Map();
  for (const person of [...local.people, ...remote.people]) {
    const seen = people.get(person.id);
    people.set(person.id, seen ? newerPerson(seen, person) : person);
  }

  const joinOrder = (a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0) || idOrder(a, b);

  return {
    ...local,
    startedAt:
      new Date(remote.startedAt) < new Date(local.startedAt) ? remote.startedAt : local.startedAt,
    people: [...people.values()].sort(joinOrder),
    events: byId([local.events, remote.events]).sort(byTime),
    customDrinks: byId([local.customDrinks, remote.customDrinks]).sort(idOrder),
  };
}

// Stable fingerprint for "did this merge change anything?" checks.
export const sessionFingerprint = (session) =>
  JSON.stringify({
    startedAt: session.startedAt,
    people: [...session.people].sort(idOrder).map((p) => [p.id, p.rev?.t ?? 0, p.rev?.by ?? ""]),
    events: session.events.map((e) => e.id).sort(),
    customDrinks: session.customDrinks.map((d) => d.id).sort(),
  });
