import { Types } from "mongoose";
import { hashtagRepository } from "../../repositories/hashtag/hashtag.repository";
import {
  IHashtagDocument,
  TrendingItem,
} from "../../types/hashtag/hashtag.types";
import { parseHashtags } from "../../utils/hashtag-parser";
import {
  HASHTAG_LIMITS,
  TRENDING_WINDOW_HOURS,
  TrendingWindowKey,
} from "../../constants/hashtag";

export class HashtagService {
  /**
   * Sync hashtags for a post: parse body, upsert hashtags, replace
   * post_hashtag rows. Returns the resolved Hashtag documents so the caller
   * can include them in API responses without an extra query.
   */
  async syncPostHashtags(
    postId: string | Types.ObjectId,
    body: string
  ): Promise<IHashtagDocument[]> {
    const parsed = parseHashtags(body);
    if (parsed.length === 0) {
      await hashtagRepository.replacePostHashtags(postId, []);
      return [];
    }

    const hashtags = await hashtagRepository.upsertManyBySlug(parsed);
    const ids = hashtags.map((h) => h._id as Types.ObjectId);
    await hashtagRepository.replacePostHashtags(postId, ids);
    return hashtags;
  }

  async clearPostHashtags(postId: string | Types.ObjectId): Promise<void> {
    await hashtagRepository.deleteByPostId(postId);
  }

  async getTrending(params: {
    window: TrendingWindowKey;
    limit: number;
  }): Promise<TrendingItem[]> {
    const windowHours = TRENDING_WINDOW_HOURS[params.window];
    const limit = Math.min(
      params.limit || HASHTAG_LIMITS.TRENDING_DEFAULT_LIMIT,
      HASHTAG_LIMITS.TRENDING_MAX_LIMIT
    );
    return hashtagRepository.getTrending({ windowHours, limit });
  }
}

export const hashtagService = new HashtagService();
