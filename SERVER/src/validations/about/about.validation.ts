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

const item = z.object({
  title: loc(2000),
  description: loc(4000),
});

const MAX_ITEMS = 24;

export const updateAboutSchema = z.object({
  hero: z
    .object({
      badge: loc(1000).optional(),
      title: loc(2000).optional(),
      subtitle: loc(4000).optional(),
    })
    .optional(),
  what: z
    .object({
      title: loc(2000).optional(),
      tagline: loc(2000).optional(),
      body: loc(30000).optional(),
    })
    .optional(),
  why: z
    .object({
      title: loc(2000).optional(),
      subtitle: loc(4000).optional(),
      items: z.array(item).max(MAX_ITEMS).optional(),
    })
    .optional(),
  features: z
    .object({
      title: loc(2000).optional(),
      subtitle: loc(4000).optional(),
      items: z.array(item).max(MAX_ITEMS).optional(),
    })
    .optional(),
  cta: z
    .object({
      title: loc(2000).optional(),
      subtitle: loc(4000).optional(),
      primary: loc(1000).optional(),
      secondary: loc(1000).optional(),
    })
    .optional(),
});
