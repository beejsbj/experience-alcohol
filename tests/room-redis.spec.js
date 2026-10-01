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
    // Retained departures hand state over but never hold a seat.
    const depart = (device, blob = "bye", time = now) => run(...roomCommand("POST", room, device, blob, time, true));
    for (let i = 0; i < LIMITS.members; i++) expect((await write(`seat${i}`))[0]).toBe(200);
    expect((await write("newcomer"))[0]).toBe(409);
    expect((await depart("seat0"))[0]).toBe(200);
    expect((await write("newcomer"))[0]).toBe(200); // the departed seat is free
    expect((await write("seat0"))[0]).toBe(409); // coming back needs a seat again
    expect((await depart("seat1"))[0]).toBe(200);
    expect((await write("seat0"))[0]).toBe(200);
    expect((await depart("seat9"))[0]).toBe(200); // a seated phone may always leave
    expect(await run("HEXISTS", `ea:room:${room}`, "seat9")).toBe(1);
    await run("FLUSHDB");
    // Departures give way first when the byte budget runs out.
    expect((await write("phone1", "x".repeat(60000)))[0]).toBe(200);
    expect((await depart("gone1", "x".repeat(60000)))[0]).toBe(200);
    expect((await depart("gone2", "x".repeat(60000)))[0]).toBe(200);
    expect((await depart("gone3", "x".repeat(60000)))[0]).toBe(200);
    expect((await write("phone2", "x".repeat(60000)))[0]).toBe(200);
    expect((await write("phone3", "x".repeat(60000)))[0]).toBe(200);
    expect(await run("HEXISTS", `ea:room:${room}`, "phone1")).toBe(1);
    expect((await write("phone4", "x".repeat(60000)))[0]).toBe(200);
    expect((await write("phone5", "x".repeat(60000)))[0]).toBe(413); // live phones are never evicted
    expect(await run("HEXISTS", `ea:room:${room}`, "phone1")).toBe(1);
    await run("FLUSHDB");
    // A rejected write must not cost anyone their retained departure.
    for (let i = 1; i <= 4; i++) expect((await write(`live${i}`, "x".repeat(60000)))[0]).toBe(200);
    expect((await depart("gone", "x".repeat(10000)))[0]).toBe(200);
    expect((await write("big", "x".repeat(65000)))[0]).toBe(413);
    expect(await run("HEXISTS", `ea:room:${room}`, "gone")).toBe(1);
    await run("FLUSHDB");
    // Retained departures are capped at the seat count, oldest dropped first.
    for (let i = 0; i < LIMITS.members + 3; i++) expect((await depart(`gone${i}`, "bye", now + i))[0]).toBe(200);
    const kept = await run("HKEYS", `ea:room:${room}`);
    expect(kept).toHaveLength(LIMITS.members);
    expect(kept).not.toContain("gone0");
    expect(kept).toContain(`gone${LIMITS.members + 2}`);
    await run("FLUSHDB");
    // An emptied table gives its slot back before the 24 h TTL.
    expect((await write("phone1"))[0]).toBe(200);
    expect((await run(...roomCommand("GET", room, "", "", now + 700000)))[0]).toBe(200);
    expect(await run("ZCARD", "ea:rooms")).toBe(0);
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
}, 45000);
