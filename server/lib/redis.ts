import Redis from "ioredis";
import { requireService } from "./supabase.js";

const REDIS_URL = process.env.REDIS_URL || process.env.KV_URL || "";

let client: Redis | null = null;
let enabled = false;

export function getRedis(): Redis {
  if (!client) {
    if (!REDIS_URL) {
      client = new Redis({ host: "localhost", port: 6379, maxRetriesPerRequest: null, enableOfflineQueue: true, lazyConnect: true });
    } else {
      client = new Redis(REDIS_URL, { maxRetriesPerRequest: null, enableOfflineQueue: true });
    }
    client.on("error", (err) => { if ((err as any)?.code !== "ECONNREFUSED") console.error("Redis error:", err.message); });
    client.on("connect", () => { enabled = true; });
    client.on("close", () => { enabled = false; });
  }
  return client;
}

export function isRedisEnabled(): boolean {
  return enabled;
}

const DEFAULT_TTL = 60;

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!enabled) return null;
  try {
    const raw = await getRedis().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function cacheSet(key: string, data: any, ttl = DEFAULT_TTL): Promise<void> {
  if (!enabled) return;
  try {
    await getRedis().setex(key, ttl, JSON.stringify(data));
  } catch { /* silent */ }
}

export async function cacheDel(pattern: string): Promise<void> {
  if (!enabled) return;
  try {
    const keys = await getRedis().keys(pattern);
    if (keys.length) await getRedis().del(...keys);
  } catch { /* silent */ }
}

export function cacheKey(...parts: string[]): string {
  return `church:${parts.join(":")}`;
}

export function invalidateOnChange(resource: string, id?: string) {
  const patterns = [`church:${resource}*`];
  if (id) patterns.push(`church:${resource}:${id}`);
  patterns.forEach(p => cacheDel(p));
}

// Fallback: wrap a DB query with cache
export async function withCache<T>(key: string, fetcher: () => Promise<T>, ttl = DEFAULT_TTL): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const data = await fetcher();
  await cacheSet(key, data, ttl);
  return data;
}

// Periodic cache refresh for dashboard stats
let refreshTimers = new Map<string, NodeJS.Timeout>();

export function startPeriodicRefresh(key: string, fetcher: () => Promise<any>, intervalMs = 30000) {
  stopPeriodicRefresh(key);
  const tick = async () => {
    try {
      const data = await fetcher();
      await cacheSet(key, data, Math.ceil(intervalMs / 1000) + 10);
    } catch { /* silent */ }
  };
  tick();
  refreshTimers.set(key, setInterval(tick, intervalMs));
}

export function stopPeriodicRefresh(key: string) {
  const t = refreshTimers.get(key);
  if (t) { clearInterval(t); refreshTimers.delete(key); }
}
