import { z } from "zod";

const slug = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and dashes only");
const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD")
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
  companyId: z.number().int().positive(),
  name: z.string().min(2).max(150),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  phone: z.string().max(40).optional().nullable(),
});

export const userCreateSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  phone: z.string().max(40).optional().nullable(),
  isActive: z.boolean().optional(),
  activeFrom: optionalDate,
  activeTo: optionalDate,
});
export const userUpdateSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  phone: z.string().max(40).optional().nullable(),
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
});

export const postUpdateSchema = z.object({
  title: z.string().max(200).optional().nullable(),
  body: z.string().optional().nullable(),
  hashtags: z.string().optional().nullable(),
  mediaUrl: z.string().url().max(500).optional().nullable(),
  status: z.enum(["draft", "generated", "approved", "scheduled", "published", "failed", "archived"]).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});
