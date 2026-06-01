import { env } from "../env";
import type { GenerateInput, GenerateResult, ProviderAdapter } from "./types";

export const openaiAdapter: ProviderAdapter = {
  name: "openai",
  isConfigured: () => Boolean(env.ai.openai.key),
  defaultModel: () => env.ai.openai.model,
  async generate({ systemPrompt, userPrompt, model }: GenerateInput): Promise<GenerateResult> {
    const useModel = model || env.ai.openai.model;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.ai.openai.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: useModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      provider: "openai",
      model: useModel,
      output: data.choices?.[0]?.message?.content ?? "",
      tokensInput: data.usage?.prompt_tokens,
      tokensOutput: data.usage?.completion_tokens,
    };
  },
};
