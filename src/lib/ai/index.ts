import { openaiAdapter } from "./openai";
import { anthropicAdapter } from "./anthropic";
import { geminiAdapter } from "./gemini";
import { ApiError } from "../api";
import { env } from "../env";
import type { GenerateInput, GenerateResult, ProviderAdapter, ProviderName } from "./types";

const ADAPTERS: Record<ProviderName, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
};

export function listProviders() {
  return (Object.keys(ADAPTERS) as ProviderName[]).map((name) => ({
    name,
    configured: ADAPTERS[name].isConfigured(),
    model: ADAPTERS[name].defaultModel(),
  }));
}

// Choose a provider: explicit request → default env → first configured.
export function pickProvider(requested?: ProviderName): ProviderAdapter {
  if (requested) {
    const a = ADAPTERS[requested];
    if (!a) throw new ApiError(`Unknown AI provider: ${requested}`, 400);
    if (!a.isConfigured()) throw new ApiError(`${requested} has no API key configured`, 400);
    return a;
  }
  const def = ADAPTERS[env.ai.defaultProvider as ProviderName];
  if (def?.isConfigured()) return def;
  const firstConfigured = (Object.values(ADAPTERS) as ProviderAdapter[]).find((a) => a.isConfigured());
  if (!firstConfigured) {
    throw new ApiError(
      "No AI provider is configured. Add OPENAI_API_KEY, ANTHROPIC_API_KEY or GEMINI_API_KEY to .env.local.",
      503
    );
  }
  return firstConfigured;
}

// Split the model output into body + hashtags.
export function parseOutput(output: string): { body: string; hashtags: string } {
  const lines = output.trim().split(/\r?\n/);
  const idx = lines.findIndex((l) => /^\s*hashtags\s*:/i.test(l));
  if (idx >= 0) {
    const body = lines.slice(0, idx).join("\n").trim();
    const hashtags = lines[idx].replace(/^\s*hashtags\s*:/i, "").trim();
    return { body, hashtags };
  }
  const tags = output.match(/#[\w]+/g);
  return { body: output.trim(), hashtags: tags ? tags.join(" ") : "" };
}

export async function generateContent(
  input: GenerateInput,
  requested?: ProviderName
): Promise<GenerateResult & { body: string; hashtags: string }> {
  const adapter = pickProvider(requested);
  const result = await adapter.generate(input);
  const { body, hashtags } = parseOutput(result.output);
  return { ...result, body, hashtags };
}

export type { GenerateResult, ProviderName };
