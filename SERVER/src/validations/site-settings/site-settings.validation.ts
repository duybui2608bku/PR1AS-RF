import { z } from "zod";

const urlOrEmpty = z.string().trim().max(500).optional();
const textField = (max: number) => z.string().trim().max(max).optional();

export const updateSiteSettingsSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  shortName: z.string().trim().min(1).max(20).optional(),
  description: textField(300),
  logoUrl: urlOrEmpty,
  faviconUrl: urlOrEmpty,
  siteUrl: urlOrEmpty,
  contactEmail: textField(254),
  ogImageUrl: urlOrEmpty,
  keywords: textField(500),
  twitterHandle: textField(50),
  facebook: urlOrEmpty,
  twitter: urlOrEmpty,
  zalo: urlOrEmpty,
  github: urlOrEmpty,
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: textField(500),
});
