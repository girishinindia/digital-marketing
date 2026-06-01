export type ProviderName = "openai" | "anthropic" | "gemini";

export interface GenerateInput {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
}

export interface GenerateResult {
  provider: ProviderName;
  model: string;
  output: string;
  tokensInput?: number;
  tokensOutput?: number;
}

export interface ProviderAdapter {
  name: ProviderName;
  isConfigured(): boolean;
  defaultModel(): string;
  generate(input: GenerateInput): Promise<GenerateResult>;
}
