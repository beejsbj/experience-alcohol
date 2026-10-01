import { describe, it, expect, vi, afterEach } from "vitest";
import { deriveRoom, encryptRecord, decryptRecord, connectRelay } from "../src/room/relayTransport";

describe("encrypted relay records", () => {
  it("derives a stable room hash with the slow v3 KDF", async () => {
    const a = await deriveRoom("abcde-fghjk");
    const b = await deriveRoom("abcde-fghjk");
    expect(a.room).toMatch(/^[a-f0-9]{64}$/);
    expect(a.room).toBe(b.room);
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode("abcde-fghjk"), "PBKDF2", false, ["deriveBits"]);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode("experience-alcohol/rooms/v3"), iterations: 100000, hash: "SHA-256" }, material, 512));
    expect(a.room).toBe(Array.from(bits.slice(0, 32), b => b.toString(16).padStart(2, "0")).join(""));
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


describe("relay lifecycle", () => {
  const connections = [];
  afterEach(async () => {
    connections.splice(0).forEach(c => c.leave());
    await new Promise(resolve => setTimeout(resolve, 20));
    vi.restoreAllMocks(); vi.unstubAllGlobals();
  });
  const connect = async (callbacks = {}) => {
    const connection = await connectRelay({ code: "abcde-fghjk", ...callbacks });
    connections.push(connection);
    return connection;
  };
  it("reuses the tab seat on reload and retains a departed snapshot without DELETE", async () => {
    const storage = new Map();
    vi.stubGlobal("sessionStorage", { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) });
    const posts = [];
    const fetcher = vi.fn(async (_url, options) => {
      if (options?.method === "POST") posts.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ entries: {} }) };
    });
    vi.stubGlobal("fetch", fetcher);
    const first = await connect();
    await first.send("state", { id: "night", events: [{ id: "last-pour" }] });
    first.leave(); connections.pop();
    await vi.waitFor(() => expect(posts).toHaveLength(2));
    const { key } = await deriveRoom("abcde-fghjk");
    expect(posts[1].departed).toBe(true);
    expect(posts[0].departed).toBeUndefined();
    expect(await decryptRecord(key, posts[1].blob)).toEqual({ hello: null, state: { id: "night", events: [{ id: "last-pour" }] }, departed: true });
    const second = await connect();
    await second.send("hello", { personId: "me" });
    expect(posts[2].device).toBe(posts[0].device);
    expect(fetcher.mock.calls.some(([, options]) => options?.method === "DELETE")).toBe(false);
  });
  it("orders immediate reconnect after the previous departure POST", async () => {
    const storage = new Map();
    vi.stubGlobal("sessionStorage", { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) });
    const posts = [];
    let releaseDeparture;
    vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
      if (options?.method === "POST") {
        posts.push(JSON.parse(options.body));
        if (posts.length === 2) await new Promise(resolve => { releaseDeparture = resolve; });
      }
      return { ok: true, json: async () => ({ entries: {} }) };
    }));
    const first = await connect();
    await first.send("hello", { personId: "me" });
    first.leave(); connections.pop();
    const reconnecting = connect();
    await vi.waitFor(() => expect(releaseDeparture).toBeTypeOf("function"));
    releaseDeparture();
    const second = await reconnecting;
    await second.send("hello", { personId: "me" });
    const { key } = await deriveRoom("abcde-fghjk");
    expect((await decryptRecord(key, posts[1].blob)).departed).toBe(true);
    expect((await decryptRecord(key, posts[2].blob)).departed).toBeUndefined();
    expect(posts[2].device).toBe(posts[1].device);
  });
  it("does not let a stalled departure block the next connection", async () => {
    const storage = new Map();
    vi.stubGlobal("sessionStorage", { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) });
    const posts = [];
    vi.stubGlobal("fetch", vi.fn((_url, options) => {
      if (options?.method === "POST") {
        posts.push(JSON.parse(options.body));
        if (posts.length === 2) return new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("aborted"))));
      }
      return Promise.resolve({ ok: true, json: async () => ({ entries: {} }) });
    }));
    const first = await connect();
    await first.send("hello", { personId: "me" });
    first.leave(); connections.pop();
    const second = await connect();
    await second.send("hello", { personId: "me" });
    expect(posts).toHaveLength(3);
    expect(posts[2].departed).toBeUndefined();
  }, 10000);
  it("sends a near-limit departure without keepalive, which browsers cap at 64 KiB", async () => {
    const options = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      if (init?.method === "POST") options.push(init);
      return { ok: true, json: async () => ({ entries: {} }) };
    }));
    const big = await connect();
    await big.send("state", { id: "night", filler: Array.from(crypto.getRandomValues(new Uint8Array(40000)), b => b.toString(16)).join("") });
    big.leave(); connections.pop();
    await vi.waitFor(() => expect(options).toHaveLength(2));
    expect(options[1].keepalive).toBe(false);
    const small = await connect();
    await small.send("state", { id: "night" });
    small.leave(); connections.pop();
    await vi.waitFor(() => expect(options).toHaveLength(4));
    expect(options[3].keepalive).toBe(true);
  });
  it("merges a retained departure without announcing a phantom peer", async () => {
    const { key } = await deriveRoom("abcde-fghjk");
    const state = { id: "night", events: [{ id: "parting" }] };
    const blob = await encryptRecord(key, { departed: true, state });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ entries: { other: { t: Date.now() - 60000, blob } } }) })));
    const onPeerJoin = vi.fn(), onMessage = vi.fn();
    await connect({ onPeerJoin, onMessage });
    await vi.waitFor(() => expect(onMessage).toHaveBeenCalledWith("state", state, "other"));
    expect(onPeerJoin).not.toHaveBeenCalled();
  });
  it("keeps a write warning through successful reads, then clears it after POST recovery", async () => {
    let rejectWrites = true;
    const fetcher = vi.fn(async (_url, options) => ({ ok: options?.method !== "POST" || !rejectWrites, json: async () => ({ entries: {} }) }));
    vi.stubGlobal("fetch", fetcher);
    const onError = vi.fn();
    const connection = await connect({ onError });
    await connection.send("state", { id: "night" });
    await vi.waitFor(() => expect(fetcher.mock.calls.some(([, options]) => !options)).toBe(true));
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(onError.mock.calls).toEqual([["can't reach the table"]]);
    rejectWrites = false;
    await connection.send("state", { id: "night", changed: true });
    expect(onError.mock.calls).toEqual([["can't reach the table"], [null]]);
  });
});
