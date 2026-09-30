import { describe, it, expect } from "vitest";
import { validRoom, validDevice, writeCommands, parseEntries } from "../api/_roomCore.js";

describe("room relay core", () => {
  it("only accepts hashed rooms and bounded device ids", () => {
    expect(validRoom("a".repeat(64))).toBe(true);
    for (const value of ["A".repeat(64), "abc", "a".repeat(65)]) expect(validRoom(value)).toBe(false);
    expect(validDevice("phone_123-abc")).toBe(true);
    for (const value of ["abc", "x".repeat(65), "phone:123"]) expect(validDevice(value)).toBe(false);
  });
  it("timestamps a write and refreshes its one-day expiry", () => {
    expect(writeCommands("a".repeat(64), "phone", "encrypted", 123)).toEqual([
      ["HSET", `ea:room:${"a".repeat(64)}`, "phone", '{"t":123,"blob":"encrypted"}'],
      ["EXPIRE", `ea:room:${"a".repeat(64)}`, 86400],
    ]);
  });
  it("keeps fresh records and prunes old or corrupt records", () => {
    expect(parseEntries(["fresh", JSON.stringify({ t: 700000, blob: "abc" }), "old", JSON.stringify({ t: 1, blob: "abc" }), "broken", "no"], 700001)).toEqual({ entries: { fresh: { t: 700000, blob: "abc" } }, stale: ["old", "broken"] });
  });
});
