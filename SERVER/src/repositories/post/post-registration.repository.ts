import { Types } from "mongoose";
import { PostRegistration, IPostRegistrationDocument } from "../../models/post/post-registration.model";

export interface RegistrantPublic {
  id: string;
  worker: {
    id: string;
    full_name: string | null;
    avatar: string | null;
  };
  created_at: Date;
}

export class PostRegistrationRepository {
  async toggle(
    postId: string,
    workerId: string
  ): Promise<{ registered: boolean }> {
    const existing = await PostRegistration.findOne({
      post_id: new Types.ObjectId(postId),
      worker_id: new Types.ObjectId(workerId),
    });

    if (existing) {
      await PostRegistration.deleteOne({ _id: existing._id });
      return { registered: false };
    }

    await PostRegistration.create({
      post_id: new Types.ObjectId(postId),
      worker_id: new Types.ObjectId(workerId),
    });
    return { registered: true };
  }

  async countByPost(postId: string): Promise<number> {
    return PostRegistration.countDocuments({
      post_id: new Types.ObjectId(postId),
    });
  }

  async countByPosts(postIds: Types.ObjectId[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (postIds.length === 0) return map;

    const results = await PostRegistration.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      { $match: { post_id: { $in: postIds } } },
      { $group: { _id: "$post_id", count: { $sum: 1 } } },
    ]);

    for (const postId of postIds) {
      map.set(postId.toString(), 0);
    }
    for (const row of results) {
      map.set(row._id.toString(), row.count);
    }
    return map;
  }

  async findByPostAndWorker(
    postId: string,
    workerId: string
  ): Promise<IPostRegistrationDocument | null> {
    return PostRegistration.findOne({
      post_id: new Types.ObjectId(postId),
      worker_id: new Types.ObjectId(workerId),
    });
  }

  async getMyRegistrationsForPosts(
    workerId: string,
    postIds: Types.ObjectId[]
  ): Promise<Set<string>> {
    const set = new Set<string>();
    if (postIds.length === 0 || !workerId) return set;

    const regs = await PostRegistration.find({
      worker_id: new Types.ObjectId(workerId),
      post_id: { $in: postIds },
    }).lean<IPostRegistrationDocument[]>();

    for (const reg of regs) {
      set.add(reg.post_id.toString());
    }
    return set;
  }

  async listByPost(
    postId: string,
    limit = 50
  ): Promise<RegistrantPublic[]> {
    const regs = await PostRegistration.find({
      post_id: new Types.ObjectId(postId),
    })
      .sort({ created_at: 1 })
      .limit(limit)
      .populate<{
        worker_id: {
          _id: Types.ObjectId;
          full_name: string | null;
          avatar: string | null;
        } | null;
      }>("worker_id", "full_name avatar")
      .lean();

    return regs.map((reg) => {
      const worker = reg.worker_id;
      return {
        id: (reg._id as Types.ObjectId).toString(),
        worker: worker
          ? {
              id: worker._id.toString(),
              full_name: worker.full_name ?? null,
              avatar: worker.avatar ?? null,
            }
          : { id: "", full_name: null, avatar: null },
        created_at: reg.created_at,
      };
    });
  }

  async listPostIdsByWorker(workerId: string): Promise<string[]> {
    const regs = await PostRegistration.find({
      worker_id: new Types.ObjectId(workerId),
    })
      .sort({ created_at: -1 })
      .select("post_id")
      .lean<{ post_id: Types.ObjectId }[]>();

    return regs.map((r) => r.post_id.toString());
  }

  async deleteByPost(
    postId: string,
    session?: import("mongoose").ClientSession
  ): Promise<void> {
    await PostRegistration.deleteMany(
      { post_id: new Types.ObjectId(postId) },
      { session }
    );
  }
}

export const postRegistrationRepository = new PostRegistrationRepository();
