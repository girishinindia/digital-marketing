// Builds a strong system + user prompt tailored to platform / post type / content type.
const PLATFORM_GUIDE: Record<string, string> = {
  facebook: "Conversational and community-friendly; 1–2 short paragraphs.",
  instagram: "Visual-first caption; punchy, tasteful emojis, a strong first line.",
  x: "Keep under 280 characters; punchy; at most 1–2 hashtags.",
  linkedin: "Professional and value-driven; first-person insight; minimal hashtags.",
  youtube: "A compelling title plus a keyword-rich description.",
  pinterest: "Keyword-rich, inspirational and action-oriented.",
  whatsapp: "Short, direct and personal broadcast tone.",
  tiktok: "Trendy and energetic; hook in the first line; trending-style hashtags.",
  snapchat: "Casual, playful and very short.",
  reddit: "Authentic and community-appropriate; no marketing fluff.",
  threads: "Casual, conversational and concise.",
  telegram: "Clear, informative channel-update tone.",
};

export function buildPrompt(opts: {
  platform: string;
  postType: string;
  contentType?: string;
  tone?: string;
  prompt: string;
  appName?: string;
}): { system: string; user: string } {
  const guide = PLATFORM_GUIDE[opts.platform] ?? "Clear, engaging social copy.";
  const ct = opts.contentType ? ` The content format is "${opts.contentType}".` : "";
  const system = [
    `You are an expert social media copywriter for ${opts.appName || "a marketing team"}.`,
    `Write ready-to-publish copy for ${opts.platform} (${opts.postType}).${ct}`,
    guide,
    `Tone: ${opts.tone || "professional yet friendly"}.`,
    `Return only the post copy. On the final line, output "Hashtags:" followed by 3–8 relevant hashtags.`,
    `Do not include any explanations or preamble.`,
  ].join(" ");
  return { system, user: opts.prompt };
}
