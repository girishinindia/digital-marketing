import { env } from "../env";
import type { GenerateInput, GenerateResult, ProviderAdapter } from "./types";

export const geminiAdapter: ProviderAdapter = {
  name: "gemini",
  isConfigured: () => Boolean(env.ai.gemini.key),
  defaultModel: () => env.ai.gemini.model,
  async generate({ systemPrompt, userPrompt, model }: GenerateInput): Promise<GenerateResult> {
    const useModel = model || env.ai.gemini.model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${env.ai.gemini.key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.8 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    return {
      provider: "gemini",
      model: useModel,
      output: text,
      tokensInput: data.usageMetadata?.promptTokenCount,
      tokensOutput: data.usageMetadata?.candidatesTokenCount,
    };
  },
};
