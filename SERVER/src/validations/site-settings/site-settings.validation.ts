import { z } from "zod";

const urlOrEmpty = z.string().trim().max(500).optional();
const textField = (max: number) => z.string().trim().max(max).optional();
const localizedTextField = (max: number) =>
  z
    .object({
      vi: textField(max),
      en: textField(max),
      zh: textField(max),
    })
    .optional();

export const updateSiteSettingsSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  shortName: z.string().trim().min(1).max(20).optional(),
  description: localizedTextField(300),
  logoUrl: urlOrEmpty,
  faviconUrl: urlOrEmpty,
  siteUrl: urlOrEmpty,
  contactEmail: textField(254),
  ogImageUrl: urlOrEmpty,
  keywords: localizedTextField(500),
  twitterHandle: textField(50),
  facebook: urlOrEmpty,
  tiktok: urlOrEmpty,
  thread: urlOrEmpty,
  instagram: urlOrEmpty,
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: textField(500),
});
