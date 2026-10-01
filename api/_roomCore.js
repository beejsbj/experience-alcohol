import { createHash } from "node:crypto";

export const validRoom = (room) => /^[a-f0-9]{64}$/.test(room ?? "");
export const validDevice = (device) => /^[a-zA-Z0-9_-]{4,64}$/.test(device ?? "");
export const keyFor = (room) => `ea:room:${room}`;

export const LIMITS = { requests: 1200, perClient: 240, rooms: 32, members: 16, bytes: 262144, ttl: 86400 };

// The key never holds a raw address: a short hash is enough to tell clients apart.
export const clientKey = (ip) => `ea:rate:ip:${createHash("sha256").update(String(ip || "unknown")).digest("hex").slice(0, 16)}`;

// One Redis transaction: concurrent callers cannot race past either quota.
// Fixed global keys also avoid creating an unbounded collection of rate keys.
export const ROOM_SCRIPT = `
-- A single client's limit is checked first, so its rejected requests never
-- spend the global budget that every other table shares.
local client = redis.call('INCR', KEYS[4])
if client == 1 then redis.call('EXPIRE', KEYS[4], 60) end
if client > tonumber(ARGV[11]) then return {429} end
local requests = redis.call('INCR', KEYS[3])
if requests == 1 then redis.call('EXPIRE', KEYS[3], 60) end
if requests > tonumber(ARGV[6]) then return {429} end
local now = tonumber(ARGV[4])
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now)
local method = ARGV[1]
local fields = redis.call('HGETALL', KEYS[1])
local count, size = 0, 0
local departed = {}
for i = 1, #fields, 2 do
  local ok, entry = pcall(cjson.decode, fields[i + 1])
  if not ok or type(entry) ~= 'table' or type(entry.t) ~= 'number' or type(entry.blob) ~= 'string' or now - entry.t > 600000 then
    redis.call('HDEL', KEYS[1], fields[i])
  else
    local bytes = string.len(fields[i]) + string.len(fields[i + 1])
    size = size + bytes
    -- A retained departure hands state over; it no longer holds a seat.
    if entry.d ~= true then count = count + 1
    elseif fields[i] ~= ARGV[2] then table.insert(departed, {fields[i], bytes, entry.t}) end
  end
end
-- Cleanup can empty a table: release its slot instead of waiting out the TTL.
if redis.call('HLEN', KEYS[1]) == 0 then redis.call('ZREM', KEYS[2], KEYS[1]) end
if method == 'GET' then return {200, redis.call('HGETALL', KEYS[1])} end
if method == 'DELETE' then
  redis.call('HDEL', KEYS[1], ARGV[2])
  if redis.call('HLEN', KEYS[1]) == 0 then redis.call('ZREM', KEYS[2], KEYS[1]) end
  return {200}
end
local old = redis.call('HGET', KEYS[1], ARGV[2])
local oldSeated = false
if old then
  local _, previous = pcall(cjson.decode, old)
  oldSeated = type(previous) == 'table' and previous.d ~= true
end
if ARGV[10] ~= '1' and not oldSeated and count >= tonumber(ARGV[8]) then return {409} end
if old then size = size - string.len(ARGV[2]) - string.len(old) end
local needed = string.len(ARGV[2]) + string.len(ARGV[3])
-- Departures are the first thing to give way (oldest first): they are capped at
-- the seat count and are evicted for room, but only when that lets the write in.
table.sort(departed, function(a, b) return a[3] < b[3] end)
local reclaimable = 0
for _, gone in ipairs(departed) do reclaimable = reclaimable + gone[2] end
if size + needed - reclaimable > tonumber(ARGV[9]) then return {413} end
local excess = #departed + (ARGV[10] == '1' and 1 or 0) - tonumber(ARGV[8])
for _, gone in ipairs(departed) do
  if excess <= 0 and size + needed <= tonumber(ARGV[9]) then break end
  redis.call('HDEL', KEYS[1], gone[1])
  size = size - gone[2]
  excess = excess - 1
end
if not redis.call('ZSCORE', KEYS[2], KEYS[1]) and redis.call('ZCARD', KEYS[2]) >= tonumber(ARGV[7]) then return {503} end
redis.call('HSET', KEYS[1], ARGV[2], ARGV[3])
redis.call('EXPIRE', KEYS[1], ARGV[5])
redis.call('ZADD', KEYS[2], now + tonumber(ARGV[5]) * 1000, KEYS[1])
redis.call('EXPIRE', KEYS[2], ARGV[5])
return {200}
`;

export function roomCommand(method, room, device = "", blob = "", now = Date.now(), departed = false, ip = "unknown") {
  return ["EVAL", ROOM_SCRIPT, 4, keyFor(room), "ea:rooms", "ea:rate", clientKey(ip), method, device,
    JSON.stringify(departed ? { t: now, blob, d: true } : { t: now, blob }), now, LIMITS.ttl, LIMITS.requests, LIMITS.rooms, LIMITS.members, LIMITS.bytes, departed ? "1" : "0", LIMITS.perClient];
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
