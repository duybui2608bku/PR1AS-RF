import { contactRepository } from "../../repositories/contact";
import type { ContactContentPatch } from "../../types/contact";

export class ContactService {
  async get() {
    return contactRepository.get();
  }

  async update(patch: ContactContentPatch, adminId: string) {
    return contactRepository.update(patch, adminId);
  }

  async reset(adminId: string) {
    return contactRepository.reset(adminId);
  }
}

export const contactService = new ContactService();
