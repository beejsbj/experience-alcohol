import { describe, it, expect, vi, afterEach } from "vitest";
import { validRoom, validDevice, roomCommand, LIMITS, parseEntries } from "../api/_roomCore.js";

describe("room relay core", () => {
  it("only accepts hashed rooms and bounded device ids", () => {
    expect(validRoom("a".repeat(64))).toBe(true);
    for (const value of ["A".repeat(64), "abc", "a".repeat(65)]) expect(validRoom(value)).toBe(false);
    expect(validDevice("phone_123-abc")).toBe(true);
    for (const value of ["abc", "x".repeat(65), "phone:123"]) expect(validDevice(value)).toBe(false);
  });
  it("runs quotas and writes atomically with only app-prefixed keys", () => {
    const command = roomCommand("POST", "a".repeat(64), "phone", "encrypted", 123);
    expect(command[0]).toBe("EVAL");
    expect(command.slice(2, 6)).toEqual([3, `ea:room:${"a".repeat(64)}`, "ea:rooms", "ea:rate"]);
    expect(command.slice(6)).toEqual(["POST", "phone", '{"t":123,"blob":"encrypted"}', 123, 86400, 1200, 32, 16, 262144, "0"]);
    expect(roomCommand("POST", "a".repeat(64), "phone", "encrypted", 123, true).slice(8)).toEqual(['{"t":123,"blob":"encrypted","d":true}', 123, 86400, 1200, 32, 16, 262144, "1"]);
    expect(LIMITS.rooms * LIMITS.bytes).toBe(8 * 1024 * 1024);
  });
  it("keeps fresh records and prunes old or corrupt records", () => {
    expect(parseEntries(["fresh", JSON.stringify({ t: 700000, blob: "abc" }), "old", JSON.stringify({ t: 1, blob: "abc" }), "broken", "no"], 700001)).toEqual({ entries: { fresh: { t: 700000, blob: "abc" } }, stale: ["old", "broken"] });
  });
});

import handler from "../api/room.js";

describe("room endpoint", () => {
  afterEach(() => vi.unstubAllGlobals());
  const request = (method = "POST") => ({ method, body: { room: "a".repeat(64), device: "phone", blob: "ciphertext" }, query: { room: "a".repeat(64) } });
  const response = () => ({ setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() });
  it.each([409, 413, 429, 503])("returns quota status %s instead of hiding it as a relay failure", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ result: [status] }] }));
    const res = response();
    await handler(request(), res);
    expect(res.status).toHaveBeenCalledWith(status);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toHaveLength(1);
  });
  it("forwards a departure flag so retained state does not hold a seat", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ result: [200] }] }));
    const req = request(); req.body.departed = true;
    await handler(req, response());
    const command = JSON.parse(fetch.mock.calls[0][1].body)[0];
    expect(command.at(-1)).toBe("1");
    expect(JSON.parse(command[8])).toMatchObject({ blob: "ciphertext", d: true });
  });
  it("returns entries from the atomic read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [{ result: [200, ["phone", JSON.stringify({ t: Date.now(), blob: "ciphertext" })]] }] }));
    const res = response();
    await handler(request("GET"), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].entries.phone.blob).toBe("ciphertext");
  });
  it("rejects oversized blobs before contacting Redis", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const req = request(); req.body.blob = "x".repeat(65537);
    const res = response();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(fetch).not.toHaveBeenCalled();
  });
});
