import { Types } from "mongoose";
import { Announcement } from "../../models/announcement/announcement.model";
import type {
  IAnnouncementDocument,
  AnnouncementListQuery,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../../types/announcement";

export class AnnouncementRepository {
  async findActiveByPlacement(
    placement: string
  ): Promise<IAnnouncementDocument | null> {
    const now = new Date();
    return Announcement.findOne({
      placements: placement,
      is_active: true,
      deleted: false,
      $and: [
        { $or: [{ start_date: null }, { start_date: { $lte: now } }] },
        { $or: [{ end_date: null }, { end_date: { $gte: now } }] },
      ],
    })
      .sort({ priority: -1, created_at: -1 })
      .lean({ virtuals: true });
  }

  async findAll(
    query: AnnouncementListQuery
  ): Promise<{ announcements: IAnnouncementDocument[]; total: number }> {
    const filter: Record<string, unknown> = { deleted: false };
    if (query.placement) filter.placements = query.placement;
    if (query.is_active !== undefined) filter.is_active = query.is_active;

    const [announcements, total] = await Promise.all([
      Announcement.find(filter)
        .sort({ created_at: -1 })
        .skip(query.skip)
        .limit(query.limit),
      Announcement.countDocuments(filter),
    ]);

    return { announcements, total };
  }

  async findById(id: string): Promise<IAnnouncementDocument | null> {
    return Announcement.findOne({ _id: id, deleted: false });
  }

  async create(
    input: CreateAnnouncementInput & { createdBy: string }
  ): Promise<IAnnouncementDocument> {
    const now = new Date();
    return new Announcement({
      title: input.title,
      content: input.content,
      images: input.images ?? [],
      display_types: input.display_types,
      display_behavior: input.display_behavior,
      target_roles: input.target_roles ?? ["all"],
      placements: input.placements,
      redirect_url: input.redirect_url ?? null,
      redirect_target: input.redirect_target,
      allow_close: input.allow_close ?? true,
      is_active: input.is_active ?? false,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      priority: input.priority ?? 0,
      created_by: new Types.ObjectId(input.createdBy),
      created_at: now,
      updated_at: now,
    }).save();
  }

  async update(
    id: string,
    input: UpdateAnnouncementInput
  ): Promise<IAnnouncementDocument | null> {
    const patch: Record<string, unknown> = { updated_at: new Date() };
    const fields: (keyof UpdateAnnouncementInput)[] = [
      "title",
      "content",
      "images",
      "display_types",
      "display_behavior",
      "target_roles",
      "placements",
      "redirect_url",
      "redirect_target",
      "allow_close",
      "is_active",
      "start_date",
      "end_date",
      "priority",
    ];
    for (const field of fields) {
      if (input[field] !== undefined) patch[field] = input[field];
    }
    return Announcement.findByIdAndUpdate(id, patch, { new: true });
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await Announcement.findByIdAndUpdate(id, {
      deleted: true,
      deleted_at: new Date(),
      updated_at: new Date(),
    });
    return result !== null;
  }
}

export const announcementRepository = new AnnouncementRepository();
