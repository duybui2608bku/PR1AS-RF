import { legalRepository } from "../../repositories/legal";
import type { LegalContentPatch, LegalPageKey } from "../../types/legal";

export class LegalService {
  async get(page: LegalPageKey) {
    return legalRepository.get(page);
  }

  async update(page: LegalPageKey, patch: LegalContentPatch, adminId: string) {
    return legalRepository.update(page, patch, adminId);
  }

  async reset(page: LegalPageKey, adminId: string) {
    return legalRepository.reset(page, adminId);
  }
}

export const legalService = new LegalService();
