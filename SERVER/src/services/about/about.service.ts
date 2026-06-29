import { aboutRepository } from "../../repositories/about";
import type { AboutContentPatch } from "../../types/about";

export class AboutService {
  async get() {
    return aboutRepository.get();
  }

  async update(patch: AboutContentPatch, adminId: string) {
    return aboutRepository.update(patch, adminId);
  }

  async reset(adminId: string) {
    return aboutRepository.reset(adminId);
  }
}

export const aboutService = new AboutService();
