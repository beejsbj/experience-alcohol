import { it, expect } from "vitest";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { roomCommand, LIMITS } from "../api/_roomCore.js";

// Opt-in integration test: isolated local Redis, no credentials or shared DB.
const server = process.env.REDIS_TEST_SERVER;
const cli = process.env.REDIS_TEST_CLI;
it.skipIf(!server || !cli)("atomically bounds concurrent writers, storage, rooms and rate in real Redis", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ea-redis-test-"));
  const socket = join(dir, "redis.sock");
  const process = spawn(server, ["--port", "0", "--unixsocket", socket, "--save", "", "--appendonly", "no"], { stdio: "ignore" });
  const run = async (...args) => JSON.parse((await promisify(execFile)(cli, ["-s", socket, "--json", ...args.map(String)])).stdout);
  try {
    for (let attempt = 0; ; attempt++) {
      try { await run("PING"); break; } catch (error) {
        if (attempt === 50) throw error;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    const room = "a".repeat(64);
    const now = Date.now();
    const write = (device, blob = "small", target = room, time = now) => run(...roomCommand("POST", target, device, blob, time));
    const results = await Promise.all(Array.from({ length: 32 }, (_, i) => write(`phone${i}`)));
    expect(results.filter(([status]) => status === 200)).toHaveLength(LIMITS.members);
    expect(results.filter(([status]) => status === 409)).toHaveLength(16);
    const fields = await run("HKEYS", `ea:room:${room}`);
    expect((await write(fields[0]))[0]).toBe(200); // existing seats can refresh a full room
    await run("FLUSHDB");
    expect((await write("phone1", "x".repeat(130000)))[0]).toBe(200);
    expect((await write("phone2", "x".repeat(130000)))[0]).toBe(200);
    expect((await write("phone3", "x".repeat(3000)))[0]).toBe(413);
    expect((await write("phone1", "smaller"))[0]).toBe(200); // replacement subtracts old bytes
    await run("FLUSHDB");
    for (let i = 0; i < LIMITS.rooms; i++) expect((await write("phone", "small", i.toString(16).padStart(64, "0")))[0]).toBe(200);
    expect((await write("phone", "small", room))[0]).toBe(503);
    expect((await write("phone", "small", room, now + LIMITS.ttl * 1000 + 1))[0]).toBe(200);
    await run("FLUSHDB");
    await run("SET", "ea:rate", LIMITS.requests, "EX", 60);
    expect((await write("phone"))[0]).toBe(429);
    expect(await run("EXISTS", `ea:room:${room}`)).toBe(0);
    expect(await run("TTL", "ea:rate")).toBeGreaterThan(0);
  } finally {
    process.kill("SIGTERM");
    await new Promise((resolve) => process.once("exit", resolve));
    await rm(dir, { recursive: true, force: true });
  }
}, 15000);
