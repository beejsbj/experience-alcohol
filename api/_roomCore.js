export const validRoom = (room) => /^[a-f0-9]{64}$/.test(room ?? "");
export const validDevice = (device) => /^[a-zA-Z0-9_-]{4,64}$/.test(device ?? "");
export const keyFor = (room) => `ea:room:${room}`;

export const LIMITS = { requests: 1200, rooms: 32, members: 16, bytes: 262144, ttl: 86400 };

// One Redis transaction: concurrent callers cannot race past either quota.
// Fixed global keys also avoid creating an unbounded collection of rate keys.
export const ROOM_SCRIPT = `
local requests = redis.call('INCR', KEYS[3])
if requests == 1 then redis.call('EXPIRE', KEYS[3], 60) end
if requests > tonumber(ARGV[6]) then return {429} end
local now = tonumber(ARGV[4])
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now)
local method = ARGV[1]
local fields = redis.call('HGETALL', KEYS[1])
local count, size = 0, 0
for i = 1, #fields, 2 do
  local ok, entry = pcall(cjson.decode, fields[i + 1])
  if not ok or type(entry) ~= 'table' or type(entry.t) ~= 'number' or type(entry.blob) ~= 'string' or now - entry.t > 600000 then
    redis.call('HDEL', KEYS[1], fields[i])
  else
    count = count + 1
    size = size + string.len(fields[i]) + string.len(fields[i + 1])
  end
end
if method == 'GET' then return {200, redis.call('HGETALL', KEYS[1])} end
if method == 'DELETE' then
  redis.call('HDEL', KEYS[1], ARGV[2])
  if redis.call('HLEN', KEYS[1]) == 0 then redis.call('ZREM', KEYS[2], KEYS[1]) end
  return {200}
end
local old = redis.call('HGET', KEYS[1], ARGV[2])
if not old and count >= tonumber(ARGV[8]) then return {409} end
if old then size = size - string.len(ARGV[2]) - string.len(old) end
if size + string.len(ARGV[2]) + string.len(ARGV[3]) > tonumber(ARGV[9]) then return {413} end
if not redis.call('ZSCORE', KEYS[2], KEYS[1]) and redis.call('ZCARD', KEYS[2]) >= tonumber(ARGV[7]) then return {503} end
redis.call('HSET', KEYS[1], ARGV[2], ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[5])
redis.call('ZADD', KEYS[2], now + tonumber(ARGV[5]) * 1000, KEYS[1])
redis.call('EXPIRE', KEYS[2], ARGV[5])
return {200}
`;

export function roomCommand(method, room, device = "", blob = "", now = Date.now()) {
  return ["EVAL", ROOM_SCRIPT, 3, keyFor(room), "ea:rooms", "ea:rate", method, device,
    JSON.stringify({ t: now, blob }), now, LIMITS.ttl, LIMITS.requests, LIMITS.rooms, LIMITS.members, LIMITS.bytes];
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
