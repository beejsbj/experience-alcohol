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

// Preserve the source revision of a synthesized legacy name. It is a separate
// register from editable person fields, so pairwise merges cannot lose the
// earliest observed name or make the result depend on snapshot grouping.
export const capturePaperMetadata = (person, people) => {
  const sourceRev = { t: person.rev?.t ?? 0, by: person.rev?.by ?? "" };
  let next = person;
  if (person.paperName == null) next = {
    ...next,
    paperName: person.needsIntro ? "" : person.name,
    paperNameBackfillRev: sourceRev,
    paperNameRev: undefined,
  };
  else if (person.paperNameBackfillRev == null && person.paperNameRev == null) next = { ...next, paperNameRev: sourceRev };
  if (!Array.isArray(person.paperInks)) next = {
    ...next,
    paperInks: [...new Set(people.filter((friend) => friend.id !== person.id && friend.active !== false && !friend.needsIntro).map((friend) => friend.color).filter(Boolean))].sort(),
    paperInksBackfill: true,
  };
  return next;
};

const paperNameOrder = (a, b) => {
  const rank = (p) => (!p.paperName ? 2 : 0) + (p.paperNameBackfillRev != null ? 1 : 0);
  return rank(a) - rank(b)
    || (a.paperNameBackfillRev != null ? compareRev(a.paperNameBackfillRev, b.paperNameBackfillRev) : -compareRev(a.paperNameRev, b.paperNameRev))
    || idOrder({ id: a.paperName ?? "" }, { id: b.paperName ?? "" });
};

const newerPerson = (a, b) => {
  const winner = compareRev(a.rev, b.rev) >= 0 ? a : b;
  // Frozen paper metadata survives edits from an older client. If two legacy
  // devices independently backfill it, choose a canonical value to converge.
  const nameSource = [a, b].sort(paperNameOrder)[0];
  const inkSource = [a, b].sort((x, y) => Number(Boolean(x.paperInksBackfill)) - Number(Boolean(y.paperInksBackfill)) || idOrder({ id: JSON.stringify(x.paperInks) }, { id: JSON.stringify(y.paperInks) }))[0];
  return {
    ...winner,
    paperName: nameSource.paperName,
    paperNameRev: nameSource.paperNameRev,
    paperNameBackfillRev: nameSource.paperNameBackfillRev,
    paperInks: inkSource.paperInks,
    paperInksBackfill: inkSource.paperInksBackfill,
  };
};

const byTime = (a, b) => {
  const d = new Date(a.timestamp) - new Date(b.timestamp);
  return d || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
};

const idOrder = (a, b) => (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0);

export function mergeSessions(local, remote) {
  if (!remote) return local;
  if (!local) return remote;

  const people = new Map();
  for (const source of [local, remote]) for (const rawPerson of source.people) {
    const person = capturePaperMetadata(rawPerson, source.people);
    const seen = people.get(person.id);
    people.set(person.id, seen ? newerPerson(seen, person) : person);
  }

  const joinOrder = (a, b) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0) || idOrder(a, b);

  const start = new Date(remote.startedAt) < new Date(local.startedAt) ? remote : local;
  const hours = [local, remote]
    .filter((session) => session.startedAt === start.startedAt && session.startedHour != null && !session.startedHourBackfillUTC)
    .map((session) => session.startedHour);
  return {
    ...local,
    startedAt: start.startedAt,
    startedHour: hours.length ? Math.min(...hours) : new Date(start.startedAt).getUTCHours(),
    startedHourBackfillUTC: hours.length ? undefined : true,
    people: [...people.values()].sort(joinOrder),
    events: byId([local.events, remote.events]).sort(byTime),
    customDrinks: byId([local.customDrinks, remote.customDrinks]).sort(idOrder),
  };
}

// Stable fingerprint for "did this merge change anything?" checks.
export const sessionFingerprint = (session) =>
  JSON.stringify({
    startedAt: session.startedAt,
    startedHour: session.startedHour ?? null,
    startedHourBackfillUTC: session.startedHourBackfillUTC === true,
    people: [...session.people].sort(idOrder).map((p) => [p.id, p.rev?.t ?? 0, p.rev?.by ?? "", p.paperName ?? null, p.paperNameRev ?? null, p.paperNameBackfillRev ?? null, p.paperInks ?? null, p.paperInksBackfill === true]),
    events: session.events.map((e) => e.id).sort(),
    customDrinks: session.customDrinks.map((d) => d.id).sort(),
  });
