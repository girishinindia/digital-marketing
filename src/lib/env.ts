// Centralised, typed access to environment variables.
function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
function opt(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  db: {
    url: req("DATABASE_URL"),
    schema: opt("DB_SCHEMA", "seo"),
  },
  jwt: {
    accessSecret: req("JWT_ACCESS_SECRET"),
    refreshSecret: req("JWT_REFRESH_SECRET"),
    accessTtl: opt("JWT_ACCESS_EXPIRES_IN", "15m"),
    refreshTtl: opt("JWT_REFRESH_EXPIRES_IN", "7d"),
  },
  redis: {
    restUrl: opt("UPSTASH_REDIS_REST_URL"),
    restToken: opt("UPSTASH_REDIS_REST_TOKEN"),
    sessionTtl: Number(opt("REDIS_SESSION_TTL", "1800")),
    cacheTtl: Number(opt("REDIS_CACHE_TTL", "300")),
    otpTtl: Number(opt("REDIS_OTP_TTL", "600")),
  },
  bunny: {
    zone: opt("BUNNY_STORAGE_ZONE"),
    key: opt("BUNNY_STORAGE_KEY"),
    storageUrl: opt("BUNNY_STORAGE_URL"),
    cdnUrl: opt("BUNNY_CDN_URL"),
  },
  recaptcha: {
    enabled: opt("RECAPTCHA_ENABLED", "false") === "true",
    secret: opt("RECAPTCHA_SECRET_KEY"),
    minScore: Number(opt("RECAPTCHA_MIN_SCORE", "0.5")),
  },
  ai: {
    defaultProvider: opt("AI_DEFAULT_PROVIDER", "openai"),
    openai: { key: opt("OPENAI_API_KEY"), model: opt("OPENAI_MODEL", "gpt-4o") },
    anthropic: { key: opt("ANTHROPIC_API_KEY"), model: opt("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest") },
    gemini: { key: opt("GEMINI_API_KEY"), model: opt("GEMINI_MODEL", "gemini-1.5-pro") },
  },
  app: {
    name: opt("NEXT_PUBLIC_APP_NAME", "Digital Marketing"),
    url: opt("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    allowPublicSignup: opt("ALLOW_PUBLIC_SIGNUP", "false") === "true",
    isProd: process.env.NODE_ENV === "production",
  },
};
