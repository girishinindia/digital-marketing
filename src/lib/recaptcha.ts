import { env } from "./env";

// Verifies a reCAPTCHA token. No-ops (returns true) when disabled.
export async function verifyRecaptcha(token?: string): Promise<boolean> {
  if (!env.recaptcha.enabled) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.recaptcha.secret, response: token }),
    });
    const data = (await res.json()) as { success: boolean; score?: number };
    if (!data.success) return false;
    if (typeof data.score === "number") return data.score >= env.recaptcha.minScore;
    return true;
  } catch {
    return false;
  }
}
