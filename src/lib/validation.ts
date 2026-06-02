import { z } from "zod";

const slug = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes only");
const slugLong = z.string().min(1).max(160).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes only");
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD")
  .nullish()
  .or(z.literal("").transform(() => null));

// Valid email, restricted to lowercase letters.
const emailLower = z
  .string()
  .email("Enter a valid email")
  .max(255)
  .refine((v) => v === v.toLowerCase(), { message: "Email must be in lowercase letters" });

// Optional 10-digit numeric mobile ("" → null).
const phone10 = z
  .string()
  .regex(/^\d{10}$/, "Mobile must be exactly 10 digits")
  .nullish()
  .or(z.literal("").transform(() => null));

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  recaptchaToken: z.string().optional(),
});

export const companyCreateSchema = z.object({
  name: z.string().min(2).max(160),
  slug: slug,
  legalName: z.string().max(200).optional().nullable(),
  website: z.string().url().max(255).optional().or(z.literal("")).nullable(),
  isActive: z.boolean().optional(),
});
export const companyUpdateSchema = companyCreateSchema.partial();

export const adminCreateSchema = z.object({
  companyId: z.coerce.number().int().positive(),
  name: z.string().min(2).max(150),
  email: emailLower,
  password: z.string().min(8).max(72),
  phone: phone10,
});

export const userCreateSchema = z.object({
  companyId: z.coerce.number().int().positive().optional(), // super admin targets a company
  name: z.string().min(2).max(150),
  email: emailLower,
  password: z.string().min(8).max(72),
  phone: phone10,
  isActive: z.boolean().optional(),
  activeFrom: optionalDate,
  activeTo: optionalDate,
});
export const userUpdateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  phone: phone10,
  password: z.string().min(8).max(72).optional(),
  isActive: z.boolean().optional(),
  activeFrom: optionalDate,
  activeTo: optionalDate,
});

export const platformSchema = z.object({
  name: z.string().min(1).max(80),
  slug: slug,
  iconUrl: z.string().url().max(255).optional().or(z.literal("")).nullable(),
  isActive: z.boolean().optional(),
});
export const contentTypeSchema = z.object({
  name: z.string().min(1).max(80),
  slug: slug,
  isActive: z.boolean().optional(),
});
export const postTypeSchema = z.object({
  platformId: z.number().int().positive(),
  name: z.string().min(1).max(80),
  slug: slug,
  isActive: z.boolean().optional(),
});
export const mappingSchema = z.object({
  postTypeId: z.number().int().positive(),
  contentTypeId: z.number().int().positive(),
});

// Replace a user's full set of granted post types (+ their content types).
export const grantSchema = z.object({
  postTypeIds: z.array(z.number().int().positive()).default([]),
  // optional fine-grained content-type restriction per post type
  contentTypeIdsByPostType: z.record(z.string(), z.array(z.number().int().positive())).optional(),
});

export const aiGenerateSchema = z.object({
  platformId: z.number().int().positive(),
  postTypeId: z.number().int().positive(),
  contentTypeId: z.number().int().positive().optional(),
  prompt: z.string().min(3).max(4000),
  tone: z.string().max(40).optional(),
  provider: z.enum(["openai", "anthropic", "gemini"]).optional(),
  savePost: z.boolean().optional(),
  companyId: z.coerce.number().int().positive().optional(), // super admin targets a company when saving
  contentCategoryId: z.coerce.number().int().positive().optional(),
  contentDetailId: z.coerce.number().int().positive().optional(),
});

// ── Company content library ──────────────────────────────────
export const contentCategorySchema = z.object({
  // BIGINT ids arrive from the DB as strings — coerce so they validate.
  companyId: z.coerce.number().int().positive().optional(), // super admin targets a company; admin uses own
  name: z.string().min(2).max(120),
  slug: slug,
  description: z.string().max(300).optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
export const contentCategoryUpdateSchema = contentCategorySchema.partial();

export const contentDetailSchema = z.object({
  companyId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive(),
  title: z.string().min(2).max(200),
  slug: slugLong,
  description: z.string().max(4000).optional().nullable(),
  suggestedContentTypeId: z.coerce.number().int().positive().optional().nullable(),
  defaultPrompt: z.string().max(4000).optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});
export const contentDetailUpdateSchema = contentDetailSchema.partial();

// ── Weekly content calendar ──────────────────────────────────
const timeOpt = z.string().regex(/^\d{2}:\d{2}$/, "use HH:MM").nullish().or(z.literal("").transform(() => null));

export const calendarCreateSchema = z.object({
  companyId: z.coerce.number().int().positive().optional(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD"),
  title: z.string().max(160).optional().nullable(),
});

export const slotCreateSchema = z.object({
  calendarId: z.coerce.number().int().positive(),
  postingUserId: z.coerce.number().int().positive(),
  platformId: z.coerce.number().int().positive(),
  postTypeId: z.coerce.number().int().positive(),
  contentTypeId: z.coerce.number().int().positive().optional().nullable(),
  contentDetailId: z.coerce.number().int().positive().optional().nullable(),
  slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD"),
  plannedTime: timeOpt,
  notes: z.string().max(2000).optional().nullable(),
});

export const slotUpdateSchema = z.object({
  platformId: z.coerce.number().int().positive().optional(),
  postTypeId: z.coerce.number().int().positive().optional(),
  contentTypeId: z.coerce.number().int().positive().optional().nullable(),
  contentDetailId: z.coerce.number().int().positive().optional().nullable(),
  slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  plannedTime: timeOpt,
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(["planned", "generated", "approved", "scheduled", "published", "skipped"]).optional(),
});

export const slotGenerateSchema = z.object({
  provider: z.enum(["openai", "anthropic", "gemini"]).optional(),
  prompt: z.string().max(4000).optional(),
});

export const postUpdateSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  body: z.string().optional().nullable(),
  hashtags: z.string().optional().nullable(),
  mediaUrl: z.string().url().max(500).optional().nullable(),
  status: z.enum(["draft", "generated", "approved", "scheduled", "published", "failed", "archived"]).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});
