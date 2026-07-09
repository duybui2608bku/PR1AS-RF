import { z } from "zod";
import { ServiceCategory, DressCode } from "../../types/service/service.type";

const localizedName = z.object({
  en: z.string().min(1, "English name is required"),
  vi: z.string().min(1, "Vietnamese name is required"),
  zh: z.string().nullable().optional(),
  ko: z.string().nullable().optional(),
});

const localizedDescription = z.object({
  en: z.string().optional(),
  vi: z.string().optional(),
  zh: z.string().nullable().optional(),
  ko: z.string().nullable().optional(),
});

const serviceRules = z.object({
  physical_touch: z.boolean(),
  intellectual_conversation_required: z.boolean(),
  dress_code: z.nativeEnum(DressCode),
});

export const createServiceSchema = z.object({
  category: z.nativeEnum(ServiceCategory),
  icon: z.string().min(1),
  name: localizedName,
  description: localizedDescription.optional(),
  companionship_level: z.number().int().min(1).max(3).nullable().optional(),
  rules: serviceRules.nullable().optional(),
});

export const updateServiceSchema = z.object({
  category: z.nativeEnum(ServiceCategory).optional(),
  icon: z.string().min(1).optional(),
  name: localizedName.optional(),
  description: localizedDescription.optional(),
  companionship_level: z.number().int().min(1).max(3).nullable().optional(),
  rules: serviceRules.nullable().optional(),
});

export const adminServiceQuerySchema = z.object({
  category: z.nativeEnum(ServiceCategory).optional(),
  is_active: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return val === "true";
    }),
});

export type CreateServiceSchemaType = z.infer<typeof createServiceSchema>;
export type UpdateServiceSchemaType = z.infer<typeof updateServiceSchema>;
export type AdminServiceQueryType = z.infer<typeof adminServiceQuerySchema>;
