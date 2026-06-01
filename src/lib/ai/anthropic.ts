import { env } from "../env";
import type { GenerateInput, GenerateResult, ProviderAdapter } from "./types";

export const anthropicAdapter: ProviderAdapter = {
  name: "anthropic",
  isConfigured: () => Boolean(env.ai.anthropic.key),
  defaultModel: () => env.ai.anthropic.model,
  async generate({ systemPrompt, userPrompt, model }: GenerateInput): Promise<GenerateResult> {
    const useModel = model || env.ai.anthropic.model;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ai.anthropic.key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: useModel,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = Array.isArray(data.content)
      ? data.content.map((b: { text?: string }) => b.text ?? "").join("")
      : "";
    return {
      provider: "anthropic",
      model: useModel,
      output: text,
      tokensInput: data.usage?.input_tokens,
      tokensOutput: data.usage?.output_tokens,
    };
  },
};
