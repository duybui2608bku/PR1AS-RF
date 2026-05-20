import { Types } from "mongoose";
import { Hashtag } from "../../models/hashtag/hashtag.model";
import { PostHashtag } from "../../models/hashtag/post-hashtag.model";
import {
  IHashtagDocument,
  TrendingItem,
} from "../../types/hashtag/hashtag.types";
import { modelsName } from "../../models/models.name";
import { ParsedHashtag } from "../../utils/hashtag-parser";

export class HashtagRepository {
  async upsertManyBySlug(parsed: ParsedHashtag[]): Promise<IHashtagDocument[]> {
    if (parsed.length === 0) return [];

    const now = new Date();
    await Hashtag.bulkWrite(
      parsed.map((tag) => ({
        updateOne: {
          filter: { slug: tag.slug },
          update: {
            $setOnInsert: { slug: tag.slug, display: tag.display, created_at: now },
          },
          upsert: true,
        },
      }))
    );

    const slugs = parsed.map((t) => t.slug);
    const docs = await Hashtag.find({ slug: { $in: slugs } }).lean<IHashtagDocument[]>();
    const bySlug = new Map(docs.map((d) => [d.slug, d]));
    return parsed
      .map((t) => bySlug.get(t.slug))
      .filter((d): d is IHashtagDocument => d != null);
  }

  /**
   * Replace the post→hashtag relation rows. Implemented as delete-then-insert
   * because the set is small (max 10) and avoids the diff-merge complexity.
   */
  async replacePostHashtags(
    postId: string | Types.ObjectId,
    hashtagIds: Types.ObjectId[]
  ): Promise<void> {
    const postObjectId =
      typeof postId === "string" ? new Types.ObjectId(postId) : postId;

    await PostHashtag.deleteMany({ post_id: postObjectId });
    if (hashtagIds.length === 0) return;

    const docs = hashtagIds.map((hashtag_id) => ({
      post_id: postObjectId,
      hashtag_id,
      created_at: new Date(),
    }));
    await PostHashtag.insertMany(docs, { ordered: false });
  }

  async deleteByPostId(
    postId: string | Types.ObjectId,
    session?: import("mongoose").ClientSession
  ): Promise<void> {
    const postObjectId =
      typeof postId === "string" ? new Types.ObjectId(postId) : postId;
    await PostHashtag.deleteMany({ post_id: postObjectId }, { session });
  }

  async findByPostId(
    postId: string | Types.ObjectId
  ): Promise<IHashtagDocument[]> {
    const postObjectId =
      typeof postId === "string" ? new Types.ObjectId(postId) : postId;
    const rows = await PostHashtag.find({ post_id: postObjectId })
      .populate<{ hashtag_id: IHashtagDocument }>("hashtag_id")
      .lean();
    return rows
      .map((row) => row.hashtag_id as unknown as IHashtagDocument)
      .filter((tag): tag is IHashtagDocument => Boolean(tag));
  }

  async findHashtagIdsByPostIds(
    postIds: Types.ObjectId[]
  ): Promise<Map<string, IHashtagDocument[]>> {
    if (postIds.length === 0) return new Map();
    const rows = await PostHashtag.find({ post_id: { $in: postIds } })
      .populate<{ hashtag_id: IHashtagDocument }>("hashtag_id")
      .lean();

    const map = new Map<string, IHashtagDocument[]>();
    for (const row of rows) {
      const key = row.post_id.toString();
      const tag = row.hashtag_id as unknown as IHashtagDocument;
      if (!tag) continue;
      const list = map.get(key) ?? [];
      list.push(tag);
      map.set(key, list);
    }
    return map;
  }

  async findHashtagBySlug(slug: string): Promise<IHashtagDocument | null> {
    return Hashtag.findOne({ slug });
  }

  async findPostIdsByHashtagSlug(slug: string): Promise<Types.ObjectId[] | null> {
    const tag = await Hashtag.findOne({ slug }).lean();
    if (!tag) return null;
    const rows = await PostHashtag.find({ hashtag_id: tag._id })
      .select("post_id")
      .lean<{ post_id: Types.ObjectId }[]>();
    return rows.map((row) => row.post_id);
  }

  /**
   * Trending hashtags = number of unique posts (within window) per hashtag,
   * excluding soft-deleted posts. Uses an aggregation pipeline that joins the
   * `posts` collection to filter by `deleted_at: null` and `created_at` >= since.
   */
  async getTrending(params: {
    windowHours: number;
    limit: number;
  }): Promise<TrendingItem[]> {
    const since = new Date(Date.now() - params.windowHours * 60 * 60 * 1000);

    const result = await PostHashtag.aggregate<TrendingItem>([
      {
        $lookup: {
          from: modelsName.POST,
          localField: "post_id",
          foreignField: "_id",
          as: "post",
        },
      },
      { $unwind: "$post" },
      {
        $match: {
          "post.deleted_at": null,
          "post.created_at": { $gte: since },
        },
      },
      {
        $group: {
          _id: "$hashtag_id",
          post_count: { $sum: 1 },
        },
      },
      { $sort: { post_count: -1, _id: 1 } },
      { $limit: params.limit },
      {
        $lookup: {
          from: modelsName.HASHTAG,
          localField: "_id",
          foreignField: "_id",
          as: "hashtag",
        },
      },
      { $unwind: "$hashtag" },
      {
        $project: {
          _id: 0,
          slug: "$hashtag.slug",
          display: "$hashtag.display",
          post_count: 1,
        },
      },
    ]);

    return result;
  }
}

export const hashtagRepository = new HashtagRepository();
