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

  async getMaintenanceStatus() {
    const settings = await siteSettingsRepository.get();
    return {
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
    };
  }
}

export const siteSettingsService = new SiteSettingsService();
