import { Types } from "mongoose";
import { Reaction } from "../../models/reaction/reaction.model";
import { IReactionDocument } from "../../types/reaction/reaction.types";
import {
  REACTION_TYPES,
  ReactionTargetType,
  ReactionType,
} from "../../constants/reaction";

export class ReactionRepository {
  async findByUserAndTarget(
    userId: string,
    targetType: ReactionTargetType,
    targetId: string
  ): Promise<IReactionDocument | null> {
    if (!Types.ObjectId.isValid(targetId)) return null;
    return Reaction.findOne({
      user_id: new Types.ObjectId(userId),
      target_type: targetType,
      target_id: new Types.ObjectId(targetId),
    });
  }

  async upsert(
    userId: string,
    targetType: ReactionTargetType,
    targetId: string,
    type: ReactionType,
    session?: import("mongoose").ClientSession
  ): Promise<{ created: boolean; previousType: ReactionType | null }> {
    if (!Types.ObjectId.isValid(targetId)) {
      return { created: false, previousType: null };
    }
    // Atomic upsert — relies on the unique (user_id, target_type, target_id)
    // index to coalesce double-clicks and concurrent requests. Mongo returns
    // the pre-update document in `rawResult.value` so we can tell whether
    // this call created a new reaction or updated an existing one, which
    // drives the post.reactions_count increment downstream.
    const userObjectId = new Types.ObjectId(userId);
    const targetObjectId = new Types.ObjectId(targetId);
    const now = new Date();
    const result = await Reaction.findOneAndUpdate(
      {
        user_id: userObjectId,
        target_type: targetType,
        target_id: targetObjectId,
      },
      {
        $set: { type, updated_at: now },
        $setOnInsert: {
          user_id: userObjectId,
          target_type: targetType,
          target_id: targetObjectId,
          created_at: now,
        },
      },
      {
        upsert: true,
        new: false,
        includeResultMetadata: true,
        setDefaultsOnInsert: true,
        session,
      }
    );
    const before = result?.value as IReactionDocument | null;
    if (before) {
      return { created: false, previousType: before.type };
    }
    return { created: true, previousType: null };
  }

  async remove(
    userId: string,
    targetType: ReactionTargetType,
    targetId: string,
    session?: import("mongoose").ClientSession
  ): Promise<{ removed: boolean; previousType: ReactionType | null }> {
    if (!Types.ObjectId.isValid(targetId)) {
      return { removed: false, previousType: null };
    }
    const existing = await Reaction.findOneAndDelete(
      {
        user_id: new Types.ObjectId(userId),
        target_type: targetType,
        target_id: new Types.ObjectId(targetId),
      },
      { session }
    );
    if (!existing) return { removed: false, previousType: null };
    return { removed: true, previousType: existing.type };
  }

  async getCountsForTarget(
    targetType: ReactionTargetType,
    targetId: string
  ): Promise<Record<ReactionType, number>> {
    const counts = REACTION_TYPES.reduce(
      (acc, key) => {
        acc[key] = 0;
        return acc;
      },
      {} as Record<ReactionType, number>
    );

    if (!Types.ObjectId.isValid(targetId)) return counts;

    const aggregated = await Reaction.aggregate<{
      _id: ReactionType;
      count: number;
    }>([
      {
        $match: {
          target_type: targetType,
          target_id: new Types.ObjectId(targetId),
        },
      },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    for (const row of aggregated) {
      counts[row._id] = row.count;
    }
    return counts;
  }

  async getCountsForTargets(
    targetType: ReactionTargetType,
    targetIds: Types.ObjectId[]
  ): Promise<Map<string, Record<ReactionType, number>>> {
    const map = new Map<string, Record<ReactionType, number>>();
    if (targetIds.length === 0) return map;

    const aggregated = await Reaction.aggregate<{
      _id: { target_id: Types.ObjectId; type: ReactionType };
      count: number;
    }>([
      {
        $match: {
          target_type: targetType,
          target_id: { $in: targetIds },
        },
      },
      {
        $group: {
          _id: { target_id: "$target_id", type: "$type" },
          count: { $sum: 1 },
        },
      },
    ]);

    for (const id of targetIds) {
      const counts = REACTION_TYPES.reduce(
        (acc, key) => {
          acc[key] = 0;
          return acc;
        },
        {} as Record<ReactionType, number>
      );
      map.set(id.toString(), counts);
    }

    for (const row of aggregated) {
      const key = row._id.target_id.toString();
      const bucket = map.get(key);
      if (bucket) bucket[row._id.type] = row.count;
    }
    return map;
  }

  async getMyReactionsForTargets(
    userId: string,
    targetType: ReactionTargetType,
    targetIds: Types.ObjectId[]
  ): Promise<Map<string, ReactionType>> {
    const map = new Map<string, ReactionType>();
    if (targetIds.length === 0 || !userId) return map;

    const reactions = await Reaction.find({
      user_id: new Types.ObjectId(userId),
      target_type: targetType,
      target_id: { $in: targetIds },
    }).lean<IReactionDocument[]>();

    for (const reaction of reactions) {
      map.set(reaction.target_id.toString(), reaction.type);
    }
    return map;
  }

  async deleteByTarget(
    targetType: ReactionTargetType,
    targetId: string | Types.ObjectId,
    session?: import("mongoose").ClientSession
  ): Promise<void> {
    const targetObjectId =
      typeof targetId === "string" ? new Types.ObjectId(targetId) : targetId;
    await Reaction.deleteMany(
      {
        target_type: targetType,
        target_id: targetObjectId,
      },
      { session }
    );
  }

  async deleteByTargets(
    targetType: ReactionTargetType,
    targetIds: Array<string | Types.ObjectId>,
    session?: import("mongoose").ClientSession
  ): Promise<void> {
    if (targetIds.length === 0) return;
    const ids = targetIds.map((id) =>
      typeof id === "string" ? new Types.ObjectId(id) : id
    );
    await Reaction.deleteMany(
      {
        target_type: targetType,
        target_id: { $in: ids },
      },
      { session }
    );
  }
}

export const reactionRepository = new ReactionRepository();
