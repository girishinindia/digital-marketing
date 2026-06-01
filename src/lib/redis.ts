import { Redis } from "@upstash/redis";
import { env } from "./env";

const globalForRedis = globalThis as unknown as { _redis?: Redis | null };

export const redis: Redis | null =
  globalForRedis._redis ??
  (env.redis.restUrl && env.redis.restToken
    ? new Redis({ url: env.redis.restUrl, token: env.redis.restToken })
    : null);

if (globalForRedis._redis === undefined) globalForRedis._redis = redis;

// Run a Redis op but never let a Redis failure crash the request.
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!redis) return fallback;
  try {
    return await fn();
  } catch (e) {
    console.error("[redis] operation failed (continuing):", (e as Error).message);
    return fallback;
  }
}

// ── session allowlist (refresh-token rotation / revocation) ──
const sKey = (jti: string) => `session:${jti}`;

export async function rememberSession(jti: string, userId: number, ttlSeconds: number) {
  await safe(() => redis!.set(sKey(jti), userId, { ex: ttlSeconds }), null);
}
export async function sessionExists(jti: string): Promise<boolean> {
  // fail-open: if Redis is unavailable, don't lock users out
  return safe(async () => (await redis!.get(sKey(jti))) !== null, true);
}
export async function forgetSession(jti: string) {
  await safe(() => redis!.del(sKey(jti)), null);
}

// ── generic cache ────────────────────────────────────────────
export async function cacheGet<T>(key: string): Promise<T | null> {
  return safe(async () => (await redis!.get<T>(key)) ?? null, null);
}
export async function cacheSet(key: string, value: unknown, ttl = env.redis.cacheTtl) {
  await safe(() => redis!.set(key, value, { ex: ttl }), null);
}
export async function cacheDel(key: string) {
  await safe(() => redis!.del(key), null);
}

// ── OTP ──────────────────────────────────────────────────────
export async function setOtp(identifier: string, code: string) {
  await safe(() => redis!.set(`otp:${identifier}`, code, { ex: env.redis.otpTtl }), null);
}
export async function verifyOtp(identifier: string, code: string): Promise<boolean> {
  return safe(async () => {
    const stored = await redis!.get<string>(`otp:${identifier}`);
    if (stored && String(stored) === code) {
      await redis!.del(`otp:${identifier}`);
      return true;
    }
    return false;
  }, false);
}

// ── fixed-window rate limit (fail-open) ──────────────────────
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  return safe(async () => {
    const k = `rl:${key}`;
    const count = await redis!.incr(k);
    if (count === 1) await redis!.expire(k, windowSeconds);
    return count <= limit;
  }, true);
}
