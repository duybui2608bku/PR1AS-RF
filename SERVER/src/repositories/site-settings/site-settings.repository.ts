import { Types } from "mongoose";
import { SiteSettings } from "../../models/site-settings";
import { SITE_SETTINGS_DEFAULTS } from "../../constants/site-settings";
import type { ISiteSettingsDocument, SiteSettingsPatch } from "../../types/site-settings";

export class SiteSettingsRepository {
  async get(): Promise<ISiteSettingsDocument> {
    const existing = await SiteSettings.findOne();
    if (existing) return existing;
    // Seed the singleton document on first access.
    return SiteSettings.create({ ...SITE_SETTINGS_DEFAULTS });
  }

  async update(
    patch: SiteSettingsPatch,
    adminId: string
  ): Promise<ISiteSettingsDocument> {
    const result = await SiteSettings.findOneAndUpdate(
      {},
      {
        $set: {
          ...patch,
          updatedBy: new Types.ObjectId(adminId),
          updatedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );
    return result!;
  }

  async reset(adminId: string): Promise<ISiteSettingsDocument> {
    return this.update({ ...SITE_SETTINGS_DEFAULTS }, adminId);
  }
}

export const siteSettingsRepository = new SiteSettingsRepository();
