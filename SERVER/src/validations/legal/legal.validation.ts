import { z } from "zod";
import { LEGAL_PAGE_KEYS } from "../../types/legal";

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

const MAX_SECTIONS = 40;

const section = z.object({
  title: loc(2000),
  body: loc(60000),
});

/** Validates the `:page` route param against the supported legal pages. */
export const legalPageParamSchema = z.object({
  page: z.enum(LEGAL_PAGE_KEYS),
});

export const updateLegalSchema = z.object({
  title: loc(2000).optional(),
  lastUpdated: loc(2000).optional(),
  intro: loc(30000).optional(),
  sections: z.array(section).max(MAX_SECTIONS).optional(),
});
