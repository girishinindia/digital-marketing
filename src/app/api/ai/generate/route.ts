import { handle, ok, fail, getClientIp, ApiError } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { requirePermission, requireCompanyId } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";
import { writeAudit } from "@/lib/audit";
import { aiGenerateSchema } from "@/lib/validation";
import { runGeneration } from "@/lib/generate";

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

  const companyId = input.savePost ? requireCompanyId(user, input.companyId ?? null) : null;
  const { content, post } = await runGeneration({
    companyId,
    authorUserId: user.id,
    postTypeId: input.postTypeId,
    contentTypeId: input.contentTypeId ?? null,
    prompt: input.prompt,
    tone: input.tone,
    provider: input.provider,
    contentCategoryId: input.contentCategoryId ?? null,
    contentDetailId: input.contentDetailId ?? null,
    savePost: input.savePost ?? false,
  });

  await writeAudit({ actorUserId: user.id, companyId: user.companyId, action: "ai.generate", entity: "post_type", entityId: input.postTypeId, metadata: { provider: content.provider }, ip: getClientIp(req) });
  return ok({ content, post });
});
