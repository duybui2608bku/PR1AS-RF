import { Types } from "mongoose";
import { PostMedia } from "../../models/post/post-media.model";
import {
  CreatePostMediaInput,
  IPostMediaDocument,
} from "../../types/post/post.types";

export class PostMediaRepository {
  async bulkCreate(
    postId: Types.ObjectId,
    items: CreatePostMediaInput[]
  ): Promise<IPostMediaDocument[]> {
    if (items.length === 0) return [];
    const docs = items.map((item, index) => ({
      post_id: postId,
      sort_order: item.sort_order ?? index,
      type: item.type,
      url: item.url.trim(),
      storage_key: item.storage_key ?? null,
      mime_type: item.mime_type ?? null,
      byte_size: item.byte_size ?? null,
      duration_seconds: item.duration_seconds ?? null,
      created_at: new Date(),
    }));
    const created = await PostMedia.insertMany(docs);
    return created as IPostMediaDocument[];
  }

  async findByPostId(
    postId: string | Types.ObjectId
  ): Promise<IPostMediaDocument[]> {
    const postObjectId =
      typeof postId === "string" ? new Types.ObjectId(postId) : postId;
    return PostMedia.find({ post_id: postObjectId })
      .sort({ sort_order: 1 })
      .lean<IPostMediaDocument[]>();
  }

  async findByPostIds(
    postIds: Types.ObjectId[]
  ): Promise<Map<string, IPostMediaDocument[]>> {
    if (postIds.length === 0) return new Map();
    const items = await PostMedia.find({ post_id: { $in: postIds } })
      .sort({ post_id: 1, sort_order: 1 })
      .lean<IPostMediaDocument[]>();

    const map = new Map<string, IPostMediaDocument[]>();
    for (const item of items) {
      const key = item.post_id.toString();
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }

  async replaceByPostId(
    postId: Types.ObjectId,
    items: CreatePostMediaInput[]
  ): Promise<IPostMediaDocument[]> {
    await PostMedia.deleteMany({ post_id: postId });
    if (items.length === 0) return [];
    return this.bulkCreate(postId, items);
  }

  async deleteByPostId(postId: string | Types.ObjectId): Promise<void> {
    const postObjectId =
      typeof postId === "string" ? new Types.ObjectId(postId) : postId;
    await PostMedia.deleteMany({ post_id: postObjectId });
  }
}

export const postMediaRepository = new PostMediaRepository();
