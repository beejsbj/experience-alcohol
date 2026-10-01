import { validRoom, validDevice, validAt, AT_SKEW_MS, roomCommand, parseEntries } from "./_roomCore.js";

// Vercel sets x-real-ip and overwrites client-supplied x-forwarded-for, so these
// cannot be spoofed there. Off Vercel (vercel dev, other hosts) they can; fine for a Vercel-only app.
const clientIp = (req) => req.headers?.["x-real-ip"] || String(req.headers?.["x-forwarded-for"] ?? "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const reply = (status, body) => res.status(status).json(body);
  if (!["GET", "POST", "DELETE"].includes(req.method)) return reply(405, { error: "method not allowed" });
  let body = req.body;
  if (req.method === "POST" && typeof body === "string") {
    try { body = JSON.parse(body); } catch { return reply(400, { error: "invalid body" }); }
  }
  const room = req.method === "POST" ? body?.room : req.query?.room;
  const device = req.method === "POST" ? body?.device : req.query?.device;
  if (typeof room !== "string" || !validRoom(room)) return reply(400, { error: "invalid room" });
  if (req.method !== "GET" && (typeof device !== "string" || !validDevice(device))) return reply(400, { error: "invalid device" });
  // A tab still running pre-`at` code omits it: stamp it with the relay's clock
  // rather than refuse its writes. One that sends `at` must send a sane one.
  const now = Date.now();
  const at = req.method === "POST" && body?.at === undefined ? now : body?.at;
  if (req.method === "POST" && (!validAt(at) || at > now + AT_SKEW_MS)) return reply(400, { error: "invalid at" });
  if (req.method === "POST" && (typeof body?.blob !== "string" || Buffer.byteLength(body.blob) > 65536)) return reply(413, { error: "invalid blob" });
  const pipeline = async (commands) => {
    const response = await fetch(`${process.env.KV_REST_API_URL}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
    });
    if (!response.ok) throw new Error("relay failed");
    const results = await response.json();
    if (!Array.isArray(results) || results.length !== commands.length || results.some((r) => r.error)) throw new Error("relay failed");
    return results;
  };
  try {
    const [result] = await pipeline([roomCommand(req.method, room, device, body?.blob, now, body?.departed === true, clientIp(req), at)]);
    const [status, fields] = result.result ?? [];
    if (![200, 409, 413, 429, 503].includes(status)) throw new Error("relay failed");
    if (status !== 200) {
      const errors = { 409: "table is full", 413: "table snapshot is too large", 429: "table relay rate limit", 503: "table relay capacity reached" };
      return reply(status, { error: errors[status] });
    }
    if (req.method === "GET") {
      if (!Array.isArray(fields)) throw new Error("relay failed");
      return reply(200, { entries: parseEntries(fields).entries });
    }
    return reply(200, { ok: true });
  } catch { return reply(502, { error: "table relay unavailable" }); }
}
