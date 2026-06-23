import { Document, Types } from "mongoose";

/** A piece of text configured per supported UI locale. */
export interface LocalizedText {
  vi: string;
  en: string;
  zh: string;
  ko: string;
}

export interface ISiteSettings {
  name: string;
  shortName: string;
  description: LocalizedText;
  logoUrl: string;
  faviconUrl: string;
  siteUrl: string;
  contactEmail: string;
  ogImageUrl: string;
  keywords: LocalizedText;
  twitterHandle: string;
  facebook: string;
  tiktok: string;
  thread: string;
  instagram: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedBy: Types.ObjectId | null;
  updatedAt: Date;
}

export interface ISiteSettingsDocument extends ISiteSettings, Document {}

export type SiteSettingsPatch = Partial<
  Omit<ISiteSettings, "updatedBy" | "updatedAt" | "description" | "keywords">
> & {
  description?: Partial<LocalizedText>;
  keywords?: Partial<LocalizedText>;
};
