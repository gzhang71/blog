/**
 * Tiny counter store for click tracking.
 *
 * In production it talks to a Vercel KV / Upstash Redis instance over the REST
 * API (no SDK dependency). If those env vars are absent — local dev, or a
 * deploy before the KV store is attached — it falls back to a JSON file on
 * disk so the site still works end to end.
 */
import fs from "node:fs/promises";
import path from "node:path";

const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const hasRemoteStore = Boolean(KV_URL && KV_TOKEN);

const LOCAL_FILE = path.join(process.cwd(), ".data", "clicks.json");

async function kv(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(KV_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`KV ${command[0]} failed: ${res.status}`);
  const json = (await res.json()) as { result: unknown };
  return json.result;
}

/**
 * Local writes are read-modify-write on one JSON file, so concurrent requests
 * would clobber each other. Serialize them through a single promise chain.
 * (The remote path needs none of this — Redis INCR/SADD are atomic.)
 */
let localQueue: Promise<unknown> = Promise.resolve();

function withLocalLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = localQueue.then(fn, fn);
  localQueue = run.catch(() => {});
  return run;
}

async function readLocal(): Promise<Record<string, number>> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function writeLocal(data: Record<string, number>): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(data, null, 2));
}

/** Increment the counter for a key, returning the new value. */
export async function increment(key: string): Promise<number> {
  if (hasRemoteStore) return Number(await kv(["INCR", key]));

  return withLocalLock(async () => {
    const data = await readLocal();
    data[key] = (data[key] ?? 0) + 1;
    await writeLocal(data);
    return data[key];
  });
}

/** Read many counters at once. Missing keys come back as 0. */
export async function readMany(keys: string[]): Promise<number[]> {
  if (keys.length === 0) return [];

  if (hasRemoteStore) {
    const result = (await kv(["MGET", ...keys])) as (string | null)[];
    return result.map((v) => (v == null ? 0 : Number(v)));
  }

  const data = await readLocal();
  return keys.map((k) => data[k] ?? 0);
}

/** Register a target so /stats knows which series exist, even at zero. */
export async function registerTarget(target: string): Promise<void> {
  if (hasRemoteStore) {
    await kv(["SADD", "clicks:targets", target]);
    return;
  }
  await withLocalLock(async () => {
    const data = await readLocal();
    const key = `target:${target}`;
    if (!(key in data)) {
      data[key] = 1;
      await writeLocal(data);
    }
  });
}

export async function listTargets(): Promise<string[]> {
  if (hasRemoteStore) {
    const members = (await kv(["SMEMBERS", "clicks:targets"])) as string[];
    return members ?? [];
  }
  const data = await readLocal();
  return Object.keys(data)
    .filter((k) => k.startsWith("target:"))
    .map((k) => k.slice("target:".length));
}
