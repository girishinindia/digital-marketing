import { handle, ok, fail, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";
import { writeAudit } from "@/lib/audit";
import { aiGenerateSchema } from "@/lib/validation";
import { buildPrompt } from "@/lib/ai/prompt";
import { generateContent } from "@/lib/ai";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = handle(async (req: Request) => {
  const user = await requirePermission("posts.create");
  if (!(await rateLimit(`ai:${user.id}`, 30, 60))) {
    return fail("Rate limit reached. Try again shortly.", 429);
  }

  const input = aiGenerateSchema.parse(await req.json());

  // Authorization: a plain user must have been granted this post type / content type.
  if (user.roleSlug === "user") {
    const grant = await queryOne<{ id: number }>(
      `SELECT id FROM seo.user_post_types WHERE user_id = $1 AND post_type_id = $2 AND is_active`,
      [user.id, input.postTypeId]
    );
    if (!grant) throw new ApiError("You don't have access to this post type", 403);
    if (input.contentTypeId) {
      const ok2 = await queryOne(
        `SELECT 1 FROM seo.user_post_type_content_types uptct
         JOIN seo.post_type_content_types ptct ON ptct.id = uptct.post_type_content_type_id
         WHERE uptct.user_post_type_id = $1 AND ptct.content_type_id = $2 AND uptct.is_active`,
        [grant.id, input.contentTypeId]
      );
      if (!ok2) throw new ApiError("You don't have access to this content type", 403);
    }
  }

  const meta = await queryOne<{
    platformSlug: string; platformName: string; postTypeName: string; platformId: number;
  }>(
    `SELECT pl.slug AS "platformSlug", pl.name AS "platformName", pt.name AS "postTypeName", pl.id AS "platformId"
     FROM seo.post_types pt JOIN seo.platforms pl ON pl.id = pt.platform_id
     WHERE pt.id = $1`,
    [input.postTypeId]
  );
  if (!meta) throw new ApiError("Post type not found", 404);

  let contentTypeName: string | undefined;
  if (input.contentTypeId) {
    const ct = await queryOne<{ name: string }>(`SELECT name FROM seo.content_types WHERE id = $1`, [input.contentTypeId]);
    contentTypeName = ct?.name;
  }

  const { system, user: userPrompt } = buildPrompt({
    platform: meta.platformSlug,
    postType: meta.postTypeName,
    contentType: contentTypeName,
    tone: input.tone,
    prompt: input.prompt,
    appName: env.app.name,
  });

  let result;
  try {
    result = await generateContent({ systemPrompt: system, userPrompt }, input.provider);
  } catch (e) {
    await query(
      `INSERT INTO seo.post_generations (user_id, provider, model, system_prompt, prompt, status, error)
       VALUES ($1,$2,$3,$4,$5,'error',$6)`,
      [user.id, input.provider ?? env.ai.defaultProvider, "n/a", system, userPrompt, (e as Error).message]
    );
    throw new ApiError(`AI generation failed: ${(e as Error).message}`, 502);
  }

  let post = null;
  if (input.savePost) {
    if (!user.companyId) throw new ApiError("Only company users can save posts", 400);
    const rows = await query(
      `INSERT INTO seo.posts (company_id, user_id, platform_id, post_type_id, content_type_id,
                              prompt, body, hashtags, status, ai_provider, ai_model,
                              content_category_id, content_detail_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'generated',$9,$10,$11,$12)
       RETURNING id, title, body, hashtags, status, ai_provider AS "aiProvider", ai_model AS "aiModel", created_at AS "createdAt"`,
      [user.companyId, user.id, meta.platformId, input.postTypeId, input.contentTypeId ?? null,
       input.prompt, result.body, result.hashtags, result.provider, result.model,
       input.contentCategoryId ?? null, input.contentDetailId ?? null]
    );
    post = rows[0];
  }

  await query(
    `INSERT INTO seo.post_generations (post_id, user_id, provider, model, system_prompt, prompt, output, tokens_input, tokens_output, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'success')`,
    [post?.id ?? null, user.id, result.provider, result.model, system, userPrompt, result.output,
     result.tokensInput ?? null, result.tokensOutput ?? null]
  );
  await writeAudit({ actorUserId: user.id, companyId: user.companyId, action: "ai.generate", entity: "post_type", entityId: input.postTypeId, metadata: { provider: result.provider }, ip: getClientIp(req) });

  return ok({
    content: { body: result.body, hashtags: result.hashtags, provider: result.provider, model: result.model },
    post,
  });
});
