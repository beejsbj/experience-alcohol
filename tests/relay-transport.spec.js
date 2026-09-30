import { describe, it, expect } from "vitest";
import { deriveRoom, encryptRecord, decryptRecord } from "../src/room/relayTransport";

describe("encrypted relay records", () => {
  it("derives a stable room hash with the v2 namespace", async () => {
    const a = await deriveRoom("abcde-fghjk");
    const b = await deriveRoom("abcde-fghjk");
    expect(a.room).toMatch(/^[a-f0-9]{64}$/);
    expect(a.room).toBe(b.room);
    expect((await deriveRoom("other-code")).room).not.toBe(a.room);
  });
  it("round-trips both messages across independently derived keys", async () => {
    const a = await deriveRoom("abcde-fghjk");
    const b = await deriveRoom("abcde-fghjk");
    const record = { hello: { deviceId: "phone", personId: 1 }, state: { id: "night", people: [] } };
    const blob = await encryptRecord(a.key, record);
    expect(await decryptRecord(b.key, blob)).toEqual(record);
    expect(await encryptRecord(a.key, record)).not.toBe(blob);
    await expect(decryptRecord((await deriveRoom("wrong-code")).key, blob)).rejects.toThrow();
    await expect(decryptRecord(a.key, "broken")).rejects.toThrow();
  });
});
