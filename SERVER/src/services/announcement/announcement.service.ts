import { announcementRepository } from "../../repositories/announcement/announcement.repository";
import { ANNOUNCEMENT_MESSAGES } from "../../constants/announcement";
import { AppError } from "../../utils/AppError";
import { PaginationHelper } from "../../utils";
import type {
  AnnouncementListQuery,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../../types/announcement";

export class AnnouncementService {
  async getActiveByPlacement(placement: string) {
    return announcementRepository.findActiveByPlacement(placement);
  }

  async list(query: AnnouncementListQuery) {
    const { announcements, total } = await announcementRepository.findAll(query);
    return PaginationHelper.formatResponse(
      announcements,
      query.page,
      query.limit,
      total
    );
  }

  async getById(id: string) {
    const announcement = await announcementRepository.findById(id);
    if (!announcement) throw AppError.notFound(ANNOUNCEMENT_MESSAGES.NOT_FOUND);
    return announcement;
  }

  async create(input: CreateAnnouncementInput, adminId: string) {
    return announcementRepository.create({ ...input, createdBy: adminId });
  }

  async update(id: string, input: UpdateAnnouncementInput) {
    const existing = await announcementRepository.findById(id);
    if (!existing) throw AppError.notFound(ANNOUNCEMENT_MESSAGES.NOT_FOUND);
    return announcementRepository.update(id, input);
  }

  async delete(id: string) {
    const existing = await announcementRepository.findById(id);
    if (!existing) throw AppError.notFound(ANNOUNCEMENT_MESSAGES.NOT_FOUND);
    return announcementRepository.softDelete(id);
  }
}

export const announcementService = new AnnouncementService();
