import { Types } from "mongoose";
import { SiteSettings } from "../../models/site-settings";
import { SITE_SETTINGS_DEFAULTS } from "../../constants/site-settings";
import type { ISiteSettingsDocument, SiteSettingsPatch } from "../../types/site-settings";

export class SiteSettingsRepository {
  async get(): Promise<ISiteSettingsDocument> {
    // Migrate legacy plain-string localized fields → localized objects. Done with
    // the native driver so values are rewritten before Mongoose casts them to the
    // new sub-schema shape (which would otherwise drop the legacy text).
    const raw = await SiteSettings.collection.findOne<{
      _id: Types.ObjectId;
      description?: unknown;
      keywords?: unknown;
    }>({});
    if (raw) {
      const migration: Record<string, unknown> = {};
      if (typeof raw.description === "string") {
        migration.description = {
          ...SITE_SETTINGS_DEFAULTS.description,
          vi: raw.description,
        };
      }
      if (typeof raw.keywords === "string") {
        migration.keywords = {
          ...SITE_SETTINGS_DEFAULTS.keywords,
          vi: raw.keywords,
        };
      }
      if (Object.keys(migration).length > 0) {
        await SiteSettings.collection.updateOne(
          { _id: raw._id },
          { $set: migration }
        );
      }
    }

    const existing = await SiteSettings.findOne();
    if (existing) return existing;
    // Seed the singleton document on first access.
    return SiteSettings.create({ ...SITE_SETTINGS_DEFAULTS });
  }

  async update(
    patch: SiteSettingsPatch,
    adminId: string
  ): Promise<ISiteSettingsDocument> {
    const { description, keywords, ...rest } = patch;

    // Flatten localized fields into dot-notation keys so updating one locale never
    // wipes the others (e.g. saving only `en` keeps the existing `vi`/`zh`).
    const set: Record<string, unknown> = {
      ...rest,
      updatedBy: new Types.ObjectId(adminId),
      updatedAt: new Date(),
    };
    for (const [field, localized] of [
      ["description", description],
      ["keywords", keywords],
    ] as const) {
      if (!localized) continue;
      for (const [locale, value] of Object.entries(localized)) {
        if (value !== undefined) set[`${field}.${locale}`] = value;
      }
    }

    const result = await SiteSettings.findOneAndUpdate(
      {},
      { $set: set },
      { new: true, upsert: true }
    );
    return result!;
  }

  async reset(adminId: string): Promise<ISiteSettingsDocument> {
    return this.update({ ...SITE_SETTINGS_DEFAULTS }, adminId);
  }
}

export const siteSettingsRepository = new SiteSettingsRepository();
