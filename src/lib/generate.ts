import { query, queryOne } from "./db";
import { buildPrompt } from "./ai/prompt";
import { generateContent, type ProviderName } from "./ai";
import { env } from "./env";
import { ApiError } from "./api";

export interface GenerationInput {
  companyId?: number | null;     // required when savePost
  authorUserId: number;          // posts.user_id (employee or company account)
  postTypeId: number;
  contentTypeId?: number | null;
  prompt: string;
  tone?: string;
  provider?: ProviderName;
  contentCategoryId?: number | null;
  contentDetailId?: number | null;
  savePost: boolean;
}

// Shared AI text generation used by the Studio and the Calendar.
export async function runGeneration(opts: GenerationInput) {
  const meta = await queryOne<{ platformId: number; platformSlug: string; postTypeName: string }>(
    `SELECT pl.id AS "platformId", pl.slug AS "platformSlug", pt.name AS "postTypeName"
     FROM seo.post_types pt JOIN seo.platforms pl ON pl.id = pt.platform_id WHERE pt.id = $1`,
    [opts.postTypeId]
  );
  if (!meta) throw new ApiError("Post type not found", 404);

  let contentTypeName: string | undefined;
  if (opts.contentTypeId) {
    const ct = await queryOne<{ name: string }>(`SELECT name FROM seo.content_types WHERE id = $1`, [opts.contentTypeId]);
    contentTypeName = ct?.name;
  }

  const { system, user } = buildPrompt({
    platform: meta.platformSlug, postType: meta.postTypeName, contentType: contentTypeName,
    tone: opts.tone, prompt: opts.prompt, appName: env.app.name,
  });

  let result;
  try {
    result = await generateContent({ systemPrompt: system, userPrompt: user }, opts.provider);
  } catch (e) {
    await query(
      `INSERT INTO seo.post_generations (user_id, provider, model, system_prompt, prompt, status, error)
       VALUES ($1,$2,$3,$4,$5,'error',$6)`,
      [opts.authorUserId, opts.provider ?? env.ai.defaultProvider, "n/a", system, user, (e as Error).message]
    );
    throw new ApiError(`AI generation failed: ${(e as Error).message}`, 502);
  }

  let post = null;
  if (opts.savePost) {
    if (!opts.companyId) throw new ApiError("A company is required to save the post", 400);
    const rows = await query(
      `INSERT INTO seo.posts (company_id, user_id, platform_id, post_type_id, content_type_id,
                              prompt, body, hashtags, status, ai_provider, ai_model, content_category_id, content_detail_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'generated',$9,$10,$11,$12)
       RETURNING id, title, body, hashtags, status, ai_provider AS "aiProvider", ai_model AS "aiModel", created_at AS "createdAt"`,
      [opts.companyId, opts.authorUserId, meta.platformId, opts.postTypeId, opts.contentTypeId ?? null,
       opts.prompt, result.body, result.hashtags, result.provider, result.model,
       opts.contentCategoryId ?? null, opts.contentDetailId ?? null]
    );
    post = rows[0];
  }

  await query(
    `INSERT INTO seo.post_generations (post_id, user_id, provider, model, system_prompt, prompt, output, tokens_input, tokens_output, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'success')`,
    [post?.id ?? null, opts.authorUserId, result.provider, result.model, system, user, result.output, result.tokensInput ?? null, result.tokensOutput ?? null]
  );

  return { content: { body: result.body, hashtags: result.hashtags, provider: result.provider, model: result.model }, post };
}

// Generate the post for a single calendar slot, link it back, and mark it generated.
export async function generateSlot(slotId: number, opts?: { provider?: ProviderName; prompt?: string }) {
  const slot = await queryOne<{
    company_id: number; posting_user_id: number; post_type_id: number; content_type_id: number | null;
    content_detail_id: number | null; notes: string | null; ideaPrompt: string | null;
    ideaCategoryId: number | null; postTypeName: string; platformName: string;
  }>(
    `SELECT s.company_id, s.posting_user_id, s.post_type_id, s.content_type_id, s.content_detail_id, s.notes,
            cd.default_prompt AS "ideaPrompt", cd.category_id AS "ideaCategoryId",
            pt.name AS "postTypeName", pl.name AS "platformName"
     FROM seo.calendar_slots s
     LEFT JOIN seo.content_details cd ON cd.id = s.content_detail_id
     JOIN seo.post_types pt ON pt.id = s.post_type_id
     JOIN seo.platforms pl ON pl.id = s.platform_id
     WHERE s.id = $1`,
    [slotId]
  );
  if (!slot) throw new ApiError("Slot not found", 404);

  const prompt =
    opts?.prompt?.trim() ||
    slot.notes?.trim() ||
    slot.ideaPrompt?.trim() ||
    `Create a ${slot.postTypeName} for ${slot.platformName}.`;

  const { post } = await runGeneration({
    companyId: Number(slot.company_id),
    authorUserId: Number(slot.posting_user_id),
    postTypeId: Number(slot.post_type_id),
    contentTypeId: slot.content_type_id != null ? Number(slot.content_type_id) : null,
    contentCategoryId: slot.ideaCategoryId != null ? Number(slot.ideaCategoryId) : null,
    contentDetailId: slot.content_detail_id != null ? Number(slot.content_detail_id) : null,
    prompt,
    provider: opts?.provider,
    savePost: true,
  });

  await query(`UPDATE seo.calendar_slots SET status = 'generated', post_id = $1 WHERE id = $2`, [post!.id, slotId]);
  return post;
}
