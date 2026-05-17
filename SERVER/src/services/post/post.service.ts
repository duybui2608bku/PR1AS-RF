import { Types } from "mongoose";
import { postRepository } from "../../repositories/post/post.repository";
import { postMediaRepository } from "../../repositories/post/post-media.repository";
import { commentRepository } from "../../repositories/comment/comment.repository";
import { hashtagRepository } from "../../repositories/hashtag/hashtag.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { reactionRepository } from "../../repositories/reaction/reaction.repository";
import { hashtagService } from "../../services/hashtag/hashtag.service";
import { pricingService } from "../../services/pricing/pricing.service";
import { PricingPackage } from "../../models/pricing";
import { PricingPlanCode } from "../../constants/pricing";
import { ReactionTargetType, ReactionType } from "../../constants/reaction";
import {
  CreatePostInput,
  IPostDocument,
  IPostMediaDocument,
  PostFeedQuery,
  PostMediaPublic,
  PostPublic,
  PostStatsPublic,
  ReactionSummaryPublic,
  UpdatePostInput,
} from "../../types/post/post.types";
import { IUserDocument } from "../../types/auth/user.types";
import { IHashtagDocument } from "../../types/hashtag/hashtag.types";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import {
  POST_MESSAGES,
  PRICING_MESSAGES,
  REPUTATION_MESSAGES,
} from "../../constants/messages";
import { POST_LIMITS, PostVisibility } from "../../constants/post";
import {
  CursorPaginatedResponse,
  decodeCursor,
  formatCursorResponse,
} from "../../utils/cursorPagination";
import { logger } from "../../utils/logger";
import dayjs from "../../utils/date";
import { moderationService } from "../moderation";
import { RestrictionFeature } from "../../constants/moderation";

type LeanPostWithAuthor = IPostDocument & {
  author_id: Pick<
    IUserDocument,
    "_id" | "full_name" | "avatar" | "worker_profile" | "meta_data"
  > | null;
};

type PostCreateQuota = {
  currentMonthPostCount: number;
  monthlyCreatePostLimit: number | null;
  remainingMonthlyCreatePosts: number | null;
  isCreateJobEnabled: boolean;
  canCreatePost: boolean;
};

const postAuthorIdToString = (authorId: unknown): string => {
  if (!authorId) return "";
  if (authorId instanceof Types.ObjectId) return authorId.toString();
  if (typeof authorId === "object" && authorId !== null && "_id" in authorId) {
    const id = (authorId as { _id: Types.ObjectId | string })._id;
    return id instanceof Types.ObjectId ? id.toString() : String(id);
  }
  return String(authorId);
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
      has_worker_profile: !!populated.worker_profile,
      meta_data: {
        pricing_plan_code: populated.meta_data?.pricing_plan_code ?? null,
      },
    };
  }
  return {
    id: fallbackId.toString(),
    full_name: null,
    avatar: null,
    has_worker_profile: false,
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

const emptyReactionSummary = (): ReactionSummaryPublic => ({
  total: 0,
  counts: {} as Record<string, number>,
  my_reaction: null,
});

const buildPostPublic = (
  post: LeanPostWithAuthor,
  media: IPostMediaDocument[],
  hashtags: IHashtagDocument[],
  reactions: ReactionSummaryPublic = emptyReactionSummary()
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
    comments_count: post.comments_count ?? 0,
    comments_locked: post.comments_locked ?? false,
    reactions,
    created_at: post.created_at,
    updated_at: post.updated_at,
  };
};

const summarizeReactions = (
  counts: Record<ReactionType, number>,
  myReaction: ReactionType | null
): ReactionSummaryPublic => {
  let total = 0;
  const summary: Record<string, number> = {};
  for (const [key, value] of Object.entries(counts)) {
    summary[key] = value;
    total += value;
  }
  return {
    total,
    counts: summary,
    my_reaction: myReaction,
  };
};

export class PostService {
  private getCurrentMonthWindow(): { startDate: Date; endDate: Date } {
    const startOfMonth = dayjs().tz().startOf("month");
    return {
      startDate: startOfMonth.toDate(),
      endDate: startOfMonth.add(1, "month").toDate(),
    };
  }

  private async getActivePricingPackageForUser(userId: string) {
    await pricingService.ensureDefaultPackages();
    await pricingService.ensureUserPlanActive(userId);

    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound(PRICING_MESSAGES.PRICING_USER_NOT_FOUND);
    }

    await moderationService.assertNoActiveRestriction(
      userId,
      RestrictionFeature.POST_CREATE
    );

    const pricingPackage = await PricingPackage.findOne({
      package_code:
        user.meta_data?.pricing_plan_code ?? PricingPlanCode.STANDARD,
      is_active: true,
    }).lean();

    if (!pricingPackage) {
      throw new AppError(
        PRICING_MESSAGES.PRICING_PACKAGE_NOT_AVAILABLE,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN
      );
    }

    return pricingPackage;
  }

  private async getPostCreateQuota(userId: string): Promise<PostCreateQuota> {
    const pricingPackage = await this.getActivePricingPackageForUser(userId);
    const { create_job_enabled, create_job_limit } = pricingPackage.features;
    const { startDate, endDate } = this.getCurrentMonthWindow();
    const currentMonthPostCount =
      await postRepository.countCreatedByAuthorBetween(
        userId,
        startDate,
        endDate
      );

    if (!create_job_enabled) {
      return {
        currentMonthPostCount,
        monthlyCreatePostLimit: create_job_limit ?? null,
        remainingMonthlyCreatePosts: 0,
        isCreateJobEnabled: false,
        canCreatePost: false,
      };
    }

    if (create_job_limit == null) {
      return {
        currentMonthPostCount,
        monthlyCreatePostLimit: null,
        remainingMonthlyCreatePosts: null,
        isCreateJobEnabled: true,
        canCreatePost: true,
      };
    }

    return {
      currentMonthPostCount,
      monthlyCreatePostLimit: create_job_limit,
      remainingMonthlyCreatePosts: Math.max(
        create_job_limit - currentMonthPostCount,
        0
      ),
      isCreateJobEnabled: true,
      canCreatePost: currentMonthPostCount < create_job_limit,
    };
  }

  private async assertUserCanCreatePost(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    const reputation = user?.meta_data?.reputation_score ?? 100;
    if (reputation < 30) {
      throw new AppError(
        REPUTATION_MESSAGES.TOO_LOW_FOR_POST,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.REPUTATION_SCORE_TOO_LOW
      );
    }

    const quota = await this.getPostCreateQuota(userId);

    if (!quota.isCreateJobEnabled) {
      throw new AppError(
        POST_MESSAGES.CREATE_JOB_FEATURE_DISABLED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.POST_CREATE_FEATURE_DISABLED
      );
    }

    if (!quota.canCreatePost) {
      throw new AppError(
        POST_MESSAGES.MONTHLY_CREATE_LIMIT_EXCEEDED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.POST_MONTHLY_LIMIT_EXCEEDED
      );
    }
  }

  async createPost(
    input: CreatePostInput,
    userId: string
  ): Promise<PostPublic> {
    await this.assertUserCanCreatePost(userId);

    const mediaItems = input.media ?? [];
    if (mediaItems.length > POST_LIMITS.MAX_MEDIA_PER_POST) {
      throw new AppError(
        POST_MESSAGES.TOO_MANY_MEDIA,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.POST_MEDIA_LIMIT_EXCEEDED
      );
    }

    const post = await postRepository.create({
      body: input.body,
      visibility: input.visibility ?? PostVisibility.PUBLIC,
      author_id: new Types.ObjectId(userId),
    });

    const postId = post._id as Types.ObjectId;
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

  async getPostById(postId: string, viewerId?: string): Promise<PostPublic> {
    const post = await postRepository.findActiveByIdLean(postId);
    if (!post) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }
    const authorId = postAuthorIdToString(post.author_id);
    const profileBlocked = viewerId
      ? await moderationService.isProfileBlocked(viewerId, authorId)
      : false;
    if (profileBlocked) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }

    const postObjectId = post._id as Types.ObjectId;

    const [media, hashtags, reactionCounts, myReactionMap] = await Promise.all([
      postMediaRepository.findByPostId(postObjectId),
      hashtagRepository.findByPostId(postObjectId),
      reactionRepository.getCountsForTarget(
        ReactionTargetType.POST,
        postObjectId.toString()
      ),
      viewerId
        ? reactionRepository.getMyReactionsForTargets(
            viewerId,
            ReactionTargetType.POST,
            [postObjectId]
          )
        : Promise.resolve(new Map<string, ReactionType>()),
    ]);

    const myReaction = myReactionMap.get(postObjectId.toString()) ?? null;

    return buildPostPublic(
      post as unknown as LeanPostWithAuthor,
      media,
      hashtags,
      summarizeReactions(reactionCounts, myReaction)
    );
  }

  async listFeed(
    query: PostFeedQuery,
    viewerId?: string
  ): Promise<CursorPaginatedResponse<PostPublic>> {
    const decodedCursor = query.cursor ? decodeCursor(query.cursor) : null;
    const excludedAuthorIds =
      await moderationService.getProfileBlockedIds(viewerId);

    if (query.author_id && excludedAuthorIds.includes(query.author_id)) {
      return { data: [], next_cursor: null, has_more: false };
    }

    let hashtagPostIds: Types.ObjectId[] | null = null;
    if (query.hashtag) {
      const postIds = await hashtagRepository.findPostIdsByHashtagSlug(
        query.hashtag.toLowerCase()
      );
      if (postIds === null) {
        return { data: [], next_cursor: null, has_more: false };
      }
      hashtagPostIds = postIds;
    }

    const items = await postRepository.findFeed({
      query,
      decodedCursor,
      hashtagPostIds,
      viewerId,
      excludedAuthorIds,
    });

    if (items.length === 0) {
      return { data: [], next_cursor: null, has_more: false };
    }

    const postIds = items.map((p) => p._id as Types.ObjectId);

    const [mediaMap, hashtagMap, reactionCountsMap, myReactionMap] =
      await Promise.all([
        postMediaRepository.findByPostIds(postIds),
        hashtagRepository.findHashtagIdsByPostIds(postIds),
        reactionRepository.getCountsForTargets(
          ReactionTargetType.POST,
          postIds
        ),
        viewerId
          ? reactionRepository.getMyReactionsForTargets(
              viewerId,
              ReactionTargetType.POST,
              postIds
            )
          : Promise.resolve(new Map<string, ReactionType>()),
      ]);

    const enriched = items.map((post) => {
      const id = (post._id as Types.ObjectId).toString();
      const media = mediaMap.get(id) ?? [];
      const hashtags = hashtagMap.get(id) ?? [];
      const counts =
        reactionCountsMap.get(id) ?? ({} as Record<ReactionType, number>);
      const myReaction = myReactionMap.get(id) ?? null;
      return buildPostPublic(
        post as unknown as LeanPostWithAuthor,
        media,
        hashtags,
        summarizeReactions(counts, myReaction)
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
    if (postAuthorIdToString(existing.author_id) !== userId) {
      throw new AppError(
        POST_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.POST_UNAUTHORIZED_ACCESS
      );
    }

    const update: Partial<Pick<IPostDocument, "body" | "visibility">> = {};
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

    const [media, hashtags, fresh, reactionCounts, myReactionMap] =
      await Promise.all([
        postMediaRepository.findByPostId(postObjectId),
        hashtagRepository.findByPostId(postObjectId),
        postRepository.findActiveByIdLean(postId),
        reactionRepository.getCountsForTarget(
          ReactionTargetType.POST,
          postObjectId.toString()
        ),
        reactionRepository.getMyReactionsForTargets(
          userId,
          ReactionTargetType.POST,
          [postObjectId]
        ),
      ]);

    const finalPost = (fresh ??
      updatedPost.toObject?.() ??
      updatedPost) as unknown as LeanPostWithAuthor;
    const myReaction = myReactionMap.get(postObjectId.toString()) ?? null;
    return buildPostPublic(
      finalPost,
      media,
      hashtags,
      summarizeReactions(reactionCounts, myReaction)
    );
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
    if (postAuthorIdToString(existing.author_id) !== userId) {
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

    // Cascade cleanup — best-effort, logged on failure
    try {
      await Promise.all([
        postMediaRepository.deleteByPostId(postId),
        hashtagService.clearPostHashtags(postId),
        commentRepository.softDeleteByPostId(postId),
        reactionRepository.deleteByTarget(ReactionTargetType.POST, postId),
      ]);
    } catch (error) {
      logger.error("Failed to cascade post soft-delete cleanup", error);
    }
  }

  async softDeletePostAsAdmin(postId: string): Promise<void> {
    const deleted = await postRepository.softDeleteAsAdmin(postId);
    if (!deleted) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }
  }

  async setCommentsLocked(
    postId: string,
    userId: string,
    locked: boolean
  ): Promise<PostPublic> {
    const existing = await postRepository.findActiveById(postId);
    if (!existing) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }
    if (postAuthorIdToString(existing.author_id) !== userId) {
      throw new AppError(
        POST_MESSAGES.UNAUTHORIZED_ACCESS,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.POST_UNAUTHORIZED_ACCESS
      );
    }

    const updated = await postRepository.setCommentsLocked(postId, locked);
    if (!updated) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }

    return this.getPostById(postId, userId);
  }

  async countActivePostsByAuthor(userId: string): Promise<PostStatsPublic> {
    const [count, quota] = await Promise.all([
      postRepository.countActiveByAuthor(userId),
      this.getPostCreateQuota(userId),
    ]);

    return {
      published_posts_count: count,
      current_month_posts_count: quota.currentMonthPostCount,
      monthly_create_post_limit: quota.monthlyCreatePostLimit,
      remaining_monthly_create_posts: quota.remainingMonthlyCreatePosts,
      can_create_post: quota.canCreatePost,
    };
  }
}

export const postService = new PostService();
