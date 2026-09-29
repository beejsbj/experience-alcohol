export const validRoom = (room) => /^[a-f0-9]{64}$/.test(room ?? "");
export const validDevice = (device) => /^[a-zA-Z0-9_-]{4,64}$/.test(device ?? "");
export const keyFor = (room) => `ea:room:${room}`;

export function writeCommands(room, device, blob, now = Date.now()) {
  return [["HSET", keyFor(room), device, JSON.stringify({ t: now, blob })],
    ["EXPIRE", keyFor(room), 86400]];
}

export function parseEntries(fields, now = Date.now()) {
  const entries = {};
  const stale = [];
  for (let i = 0; i < fields.length; i += 2) {
    try {
      const value = JSON.parse(fields[i + 1]);
      if (!Number.isFinite(value.t) || typeof value.blob !== "string" || now - value.t > 600000) {
        stale.push(fields[i]);
      } else entries[fields[i]] = value;
    } catch { stale.push(fields[i]); }
  }
  return { entries, stale };
}
