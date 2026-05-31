import { siteSettingsRepository } from "../../repositories/site-settings";
import type { SiteSettingsPatch } from "../../types/site-settings";

export class SiteSettingsService {
  async get() {
    return siteSettingsRepository.get();
  }

  async update(patch: SiteSettingsPatch, adminId: string) {
    return siteSettingsRepository.update(patch, adminId);
  }

  async reset(adminId: string) {
    return siteSettingsRepository.reset(adminId);
  }
}

export const siteSettingsService = new SiteSettingsService();
