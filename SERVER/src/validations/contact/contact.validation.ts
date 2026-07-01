import { z } from "zod";

// Per-locale text. All locales optional so a partial save (e.g. only `en`)
// never wipes the others. Values arrive already HTML-sanitized by the global
// `sanitizeInput` middleware before this validation runs.
const loc = (max: number) =>
  z.object({
    vi: z.string().max(max).optional(),
    en: z.string().max(max).optional(),
    zh: z.string().max(max).optional(),
    ko: z.string().max(max).optional(),
  });

export const updateContactSchema = z.object({
  title: loc(2000).optional(),
  subtitle: loc(4000).optional(),
  // Allow a valid email or an empty string (admin clearing the field).
  email: z.string().max(320).email().or(z.literal("")).optional(),
  phone: z.string().max(64).optional(),
  address: loc(2000).optional(),
  hours: loc(2000).optional(),
  body: loc(30000).optional(),
});
