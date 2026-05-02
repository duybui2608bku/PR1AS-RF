import { Types } from "mongoose";
import { postRepository } from "../../repositories/post/post.repository";
import { postMediaRepository } from "../../repositories/post/post-media.repository";
import { commentRepository } from "../../repositories/comment/comment.repository";
import { hashtagRepository } from "../../repositories/hashtag/hashtag.repository";
import { hashtagService } from "../../services/hashtag/hashtag.service";
import { PostHashtag } from "../../models/hashtag/post-hashtag.model";
import {
  CreatePostInput,
  IPostDocument,
  IPostMediaDocument,
  PostFeedQuery,
  PostMediaPublic,
  PostPublic,
  PostStatsPublic,
  UpdatePostInput,
} from "../../types/post/post.types";
import { IUserDocument } from "../../types/auth/user.types";
import { IHashtagDocument } from "../../types/hashtag/hashtag.types";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { POST_MESSAGES } from "../../constants/messages";
import { POST_LIMITS, PostVisibility } from "../../constants/post";
import {
  CursorPaginatedResponse,
  decodeCursor,
  formatCursorResponse,
} from "../../utils/cursorPagination";
import { logger } from "../../utils/logger";

type LeanPostWithAuthor = IPostDocument & {
  author_id: Pick<IUserDocument, "_id" | "full_name" | "avatar"> | null;
};

const toAuthorPublic = (
  post: LeanPostWithAuthor,
  fallbackId: Types.ObjectId
) => {
  const populated = post.author_id;
  if (populated && typeof populated === "object" && "_id" in populated) {
    return {
      id: populated._id.toString(),
      full_name: populated.full_name ?? null,
      avatar: populated.avatar ?? null,
    };
  }
  return {
    id: fallbackId.toString(),
    full_name: null,
    avatar: null,
  };
};

const toMediaPublic = (media: IPostMediaDocument): PostMediaPublic => ({
  id: (media._id as Types.ObjectId).toString(),
  type: media.type,
  url: media.url,
  sort_order: media.sort_order,
  mime_type: media.mime_type ?? null,
  byte_size: media.byte_size ?? null,
  duration_seconds: media.duration_seconds ?? null,
});

const toHashtagPublic = (tag: IHashtagDocument) => ({
  slug: tag.slug,
  display: tag.display,
});

const buildPostPublic = (
  post: LeanPostWithAuthor,
  media: IPostMediaDocument[],
  hashtags: IHashtagDocument[]
): PostPublic => {
  const populated = post.author_id;
  const authorId =
    populated && typeof populated === "object" && "_id" in populated
      ? (populated._id as Types.ObjectId)
      : (post.author_id as unknown as Types.ObjectId);

  return {
    id: (post._id as Types.ObjectId).toString(),
    author: toAuthorPublic(post, authorId),
    body: post.body,
    media: media.map(toMediaPublic),
    hashtags: hashtags.map(toHashtagPublic),
    visibility: post.visibility,
    created_at: post.created_at,
    updated_at: post.updated_at,
  };
};

export class PostService {
  async createPost(
    input: CreatePostInput,
    userId: string
  ): Promise<PostPublic> {
    const post = await postRepository.create({
      body: input.body,
      visibility: input.visibility ?? PostVisibility.PUBLIC,
      author_id: new Types.ObjectId(userId),
    });

    const postId = post._id as Types.ObjectId;
    const mediaItems = input.media ?? [];
    if (mediaItems.length > POST_LIMITS.MAX_MEDIA_PER_POST) {
      throw new AppError(
        POST_MESSAGES.TOO_MANY_MEDIA,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.POST_MEDIA_LIMIT_EXCEEDED
      );
    }

    const media = await postMediaRepository.bulkCreate(postId, mediaItems);

    let hashtags: IHashtagDocument[] = [];
    try {
      hashtags = await hashtagService.syncPostHashtags(postId, post.body);
    } catch (error) {
      logger.error("Failed to sync hashtags on post create", error);
    }

    const persisted = await postRepository.findActiveByIdLean(
      postId.toString()
    );
    const finalPost = (persisted ?? post) as unknown as LeanPostWithAuthor;
    return buildPostPublic(finalPost, media, hashtags);
  }

  async getPostById(postId: string): Promise<PostPublic> {
    const post = await postRepository.findActiveByIdLean(postId);
    if (!post) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }

    const [media, hashtags] = await Promise.all([
      postMediaRepository.findByPostId(post._id as Types.ObjectId),
      hashtagRepository.findByPostId(post._id as Types.ObjectId),
    ]);

    return buildPostPublic(
      post as unknown as LeanPostWithAuthor,
      media,
      hashtags
    );
  }

  async listFeed(
    query: PostFeedQuery
  ): Promise<CursorPaginatedResponse<PostPublic>> {
    const decodedCursor = query.cursor ? decodeCursor(query.cursor) : null;

    let hashtagPostIds: Types.ObjectId[] | null = null;
    if (query.hashtag) {
      const tag = await hashtagRepository.findHashtagBySlug(
        query.hashtag.toLowerCase()
      );
      if (!tag) {
        return { data: [], next_cursor: null, has_more: false };
      }
      // We do not want to load every post id for huge tags. The repo will
      // already filter `_id IN (...)`, so we leverage Mongo's index. If a tag
      // has too many posts in production, switch to an aggregation pipeline.
      const rows = await PostHashtag.find({ hashtag_id: tag._id })
        .select("post_id")
        .lean<{ post_id: Types.ObjectId }[]>();
      hashtagPostIds = rows.map((row) => row.post_id);
    }

    const items = await postRepository.findFeed({
      query,
      decodedCursor,
      hashtagPostIds,
    });

    if (items.length === 0) {
      return { data: [], next_cursor: null, has_more: false };
    }

    const postIds = items.map((p) => p._id as Types.ObjectId);

    const [mediaMap, hashtagMap] = await Promise.all([
      postMediaRepository.findByPostIds(postIds),
      hashtagRepository.findHashtagIdsByPostIds(postIds),
    ]);

    const enriched = items.map((post) => {
      const id = (post._id as Types.ObjectId).toString();
      const media = mediaMap.get(id) ?? [];
      const hashtags = hashtagMap.get(id) ?? [];
      return buildPostPublic(
        post as unknown as LeanPostWithAuthor,
        media,
        hashtags
      );
    });

    return formatCursorResponse(enriched, query.limit, (item) => ({
      createdAt: item.created_at,
      id: item.id,
    }));
  }

  async updatePost(
    postId: string,
    input: UpdatePostInput,
    userId: string
  ): Promise<PostPublic> {
    const existing = await postRepository.findActiveById(postId);
    if (!existing) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }
    if (existing.author_id.toString() !== userId) {
      throw new AppError(
        POST_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.POST_UNAUTHORIZED_ACCESS
      );
    }

    const update: Partial<{ body: string; visibility: PostVisibility }> = {};
    if (input.body !== undefined) update.body = input.body.trim();
    if (input.visibility !== undefined) update.visibility = input.visibility;

    const updatedPost = await postRepository.update(postId, update);
    if (!updatedPost) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }

    const postObjectId = updatedPost._id as Types.ObjectId;

    if (input.media !== undefined) {
      if (input.media.length > POST_LIMITS.MAX_MEDIA_PER_POST) {
        throw new AppError(
          POST_MESSAGES.TOO_MANY_MEDIA,
          HTTP_STATUS.BAD_REQUEST,
          ErrorCode.POST_MEDIA_LIMIT_EXCEEDED
        );
      }
      await postMediaRepository.replaceByPostId(postObjectId, input.media);
    }

    if (input.body !== undefined) {
      try {
        await hashtagService.syncPostHashtags(postObjectId, update.body ?? "");
      } catch (error) {
        logger.error("Failed to sync hashtags on post update", error);
      }
    }

    const [media, hashtags, fresh] = await Promise.all([
      postMediaRepository.findByPostId(postObjectId),
      hashtagRepository.findByPostId(postObjectId),
      postRepository.findActiveByIdLean(postId),
    ]);

    const finalPost = (fresh ??
      updatedPost.toObject?.() ??
      updatedPost) as unknown as LeanPostWithAuthor;
    return buildPostPublic(finalPost, media, hashtags);
  }

  async softDeletePost(postId: string, userId: string): Promise<void> {
    const existing = await postRepository.findActiveById(postId);
    if (!existing) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }
    if (existing.author_id.toString() !== userId) {
      throw new AppError(
        POST_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.POST_UNAUTHORIZED_ACCESS
      );
    }

    const deleted = await postRepository.softDelete(postId);
    if (!deleted) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }

    // Cascade cleanup so the deleted post stops contributing to feeds,
    // trending counts, and visible comment threads. Each step is best-effort
    // and logged: a partial failure shouldn't fail the user-facing delete.
    try {
      await Promise.all([
        postMediaRepository.deleteByPostId(postId),
        hashtagService.clearPostHashtags(postId),
        commentRepository.softDeleteByPostId(postId),
      ]);
    } catch (error) {
      logger.error("Failed to cascade post soft-delete cleanup", error);
    }
  }

  async countActivePostsByAuthor(userId: string): Promise<PostStatsPublic> {
    const count = await postRepository.countActiveByAuthor(userId);
    return { published_posts_count: count };
  }
}

export const postService = new PostService();
