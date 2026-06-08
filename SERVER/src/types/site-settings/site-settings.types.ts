import { Document, Types } from "mongoose";

export interface ISiteSettings {
  name: string;
  shortName: string;
  description: string;
  logoUrl: string;
  faviconUrl: string;
  siteUrl: string;
  contactEmail: string;
  ogImageUrl: string;
  keywords: string;
  twitterHandle: string;
  facebook: string;
  twitter: string;
  zalo: string;
  github: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedBy: Types.ObjectId | null;
  updatedAt: Date;
}

export interface ISiteSettingsDocument extends ISiteSettings, Document {}

export type SiteSettingsPatch = Partial<Omit<ISiteSettings, "updatedBy" | "updatedAt">>;
