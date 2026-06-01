import { Redis } from "@upstash/redis";
import { env } from "./env";

const globalForRedis = globalThis as unknown as { _redis?: Redis | null };

export const redis: Redis | null =
  globalForRedis._redis ??
  (env.redis.restUrl && env.redis.restToken
    ? new Redis({ url: env.redis.restUrl, token: env.redis.restToken })
    : null);

if (globalForRedis._redis === undefined) globalForRedis._redis = redis;

// ── session allowlist (refresh-token rotation / revocation) ──
const sKey = (jti: string) => `session:${jti}`;

export async function rememberSession(jti: string, userId: number, ttlSeconds: number) {
  if (!redis) return;
  await redis.set(sKey(jti), userId, { ex: ttlSeconds });
}
export async function sessionExists(jti: string): Promise<boolean> {
  if (!redis) return true; // fail-open when Redis isn't configured (dev)
  return (await redis.get(sKey(jti))) !== null;
}
export async function forgetSession(jti: string) {
  if (!redis) return;
  await redis.del(sKey(jti));
}

// ── generic cache ────────────────────────────────────────────
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  return (await redis.get<T>(key)) ?? null;
}
export async function cacheSet(key: string, value: unknown, ttl = env.redis.cacheTtl) {
  if (!redis) return;
  await redis.set(key, value, { ex: ttl });
}
export async function cacheDel(key: string) {
  if (!redis) return;
  await redis.del(key);
}

// ── OTP ──────────────────────────────────────────────────────
export async function setOtp(identifier: string, code: string) {
  if (!redis) return;
  await redis.set(`otp:${identifier}`, code, { ex: env.redis.otpTtl });
}
export async function verifyOtp(identifier: string, code: string): Promise<boolean> {
  if (!redis) return false;
  const stored = await redis.get<string>(`otp:${identifier}`);
  if (stored && String(stored) === code) {
    await redis.del(`otp:${identifier}`);
    return true;
  }
  return false;
}

// ── fixed-window rate limit ──────────────────────────────────
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (!redis) return true; // allow when Redis unavailable
  const k = `rl:${key}`;
  const count = await redis.incr(k);
  if (count === 1) await redis.expire(k, windowSeconds);
  return count <= limit;
}
