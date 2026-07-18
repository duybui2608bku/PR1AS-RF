import mongoose, { Types } from "mongoose";
import { sanitizeMessageContent } from "../../utils/sanitize";
import { postRepository } from "../../repositories/post/post.repository";
import { postMediaRepository } from "../../repositories/post/post-media.repository";
import { postEditHistoryRepository } from "../../repositories/post/post-edit-history.repository";
import { commentRepository } from "../../repositories/comment/comment.repository";
import { hashtagRepository } from "../../repositories/hashtag/hashtag.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { reactionRepository } from "../../repositories/reaction/reaction.repository";
import { moderationRepository } from "../../repositories/moderation";
import { postRegistrationRepository } from "../../repositories/post/post-registration.repository";
import { hashtagService } from "../../services/hashtag/hashtag.service";
import { pricingService } from "../../services/pricing/pricing.service";
import { ReactionTargetType, ReactionType } from "../../constants/reaction";
import { UserRole } from "../../types/auth/user.types";
import {
  CreatePostInput,
  IPostDocument,
  IPostMediaDocument,
  PostFeedQuery,
  PostMediaPublic,
  PostPublic,
  PostRegistrationsListPublic,
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
  POST_REGISTRATION_MESSAGES,
  REPUTATION_MESSAGES,
} from "../../constants/messages";
import { POST_LIMITS, PostVisibility } from "../../constants/post";
import {
  CursorPaginatedResponse,
  decodeCursor,
  formatCursorResponse,
} from "../../utils/cursorPagination";
import { logger } from "../../utils/logger";
import { getCurrentMonthWindow } from "../../utils/date";
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
  reactions: ReactionSummaryPublic = emptyReactionSummary(),
  registrations_count = 0,
  my_registration = false
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
    registrations_count,
    my_registration,
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
  // Pure read — no moderation check here. This is shared by the write-path
  // gate (assertUserCanCreatePost) AND the read-only stats endpoint
  // (countActivePostsByAuthor, polled by the frontend's proactive
  // create-post gate). A restricted user must still be able to read their
  // quota without the request throwing — moderation eligibility is enforced
  // separately, only on the actual create-post write path.
  private async getPostCreateQuota(userId: string): Promise<PostCreateQuota> {
    const pricingPackage = await pricingService.getActivePackageForUser(userId);
    const { create_job_enabled, create_job_limit } = pricingPackage.features;
    const { startDate, endDate } = getCurrentMonthWindow();
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

    // Posts in this app are job listings — gated by the `create_job_*`
    // pricing features. Only users currently acting as CLIENT (i.e. posting a
    // job) may create them. A user with both roles must switch to CLIENT mode
    // first; a worker-only account cannot post jobs at all.
    if (user?.last_active_role !== UserRole.CLIENT) {
      throw new AppError(
        POST_MESSAGES.CREATE_JOB_FEATURE_DISABLED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.POST_CREATE_FEATURE_DISABLED
      );
    }

    await moderationService.assertNoActiveRestriction(
      userId,
      RestrictionFeature.POST_CREATE
    );

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

    const sanitizedBody = sanitizeMessageContent(input.body ?? "", 5000);
    if (!sanitizedBody) {
      throw new AppError(
        POST_MESSAGES.INVALID_BODY_LENGTH,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR
      );
    }

    const post = await postRepository.create({
      body: sanitizedBody,
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

    const [media, hashtags, reactionCounts, myReactionMap, regCount, myReg] =
      await Promise.all([
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
        postRegistrationRepository.countByPost(postObjectId.toString()),
        viewerId
          ? postRegistrationRepository.findByPostAndWorker(
              postObjectId.toString(),
              viewerId
            )
          : Promise.resolve(null),
      ]);

    const myReaction = myReactionMap.get(postObjectId.toString()) ?? null;

    return buildPostPublic(
      post as unknown as LeanPostWithAuthor,
      media,
      hashtags,
      summarizeReactions(reactionCounts, myReaction),
      regCount,
      myReg !== null
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

    const [mediaMap, hashtagMap, reactionCountsMap, myReactionMap, regCountMap, myRegSet] =
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
        postRegistrationRepository.countByPosts(postIds),
        viewerId
          ? postRegistrationRepository.getMyRegistrationsForPosts(viewerId, postIds)
          : Promise.resolve(new Set<string>()),
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
        summarizeReactions(counts, myReaction),
        regCountMap.get(id) ?? 0,
        myRegSet.has(id)
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
    if (input.body !== undefined) {
      const sanitizedBody = sanitizeMessageContent(input.body, 5000);
      if (!sanitizedBody) {
        throw new AppError(
          POST_MESSAGES.INVALID_BODY_LENGTH,
          HTTP_STATUS.BAD_REQUEST,
          ErrorCode.VALIDATION_ERROR
        );
      }
      update.body = sanitizedBody;
    }
    if (input.visibility !== undefined) update.visibility = input.visibility;

    // If the post is currently the subject of an open report, capture the
    // pre-edit body+media before applying the update. This blocks the
    // bait-and-switch pattern where a job poster edits a reported post to
    // hide what the reporter (or applied worker) actually saw. We only
    // snapshot when an open report exists to keep history-table volume small.
    const bodyChanging =
      update.body !== undefined && update.body !== existing.body;
    const mediaChanging = input.media !== undefined;
    if (bodyChanging || mediaChanging) {
      try {
        const hasOpenReport =
          await moderationRepository.hasOpenReportForPost(postId);
        if (hasOpenReport) {
          const preEditMedia = await postMediaRepository.findByPostId(
            existing._id as Types.ObjectId
          );
          await postEditHistoryRepository.snapshot({
            post: {
              _id: existing._id,
              author_id: existing.author_id,
              body: existing.body,
            },
            media: preEditMedia,
            reason: "edited_after_report",
          });
        }
      } catch (error) {
        logger.error("Failed to snapshot post pre-edit state", error);
      }
    }

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

    // Wrap soft-delete + cascade cleanup in a transaction so the post and its
    // dependent rows (hashtags, comments, post reactions, comment reactions)
    // either all flip to deleted or none do — avoids orphan reactions/
    // comments when one of the cascade writes fails mid-flight. Comment
    // reactions need to be reaped explicitly: soft-deleting the comments
    // leaves their reaction rows pointing at hidden targets, which would
    // skew counts and break invariants on the next reconcile pass.
    const session = await mongoose.startSession();
    try {
      let deleted: unknown = null;
      await session.withTransaction(async () => {
        deleted = await postRepository.softDelete(postId, session);
        if (!deleted) return;
        const commentIds = await commentRepository.findIdsByPostId(
          postId,
          session
        );
        await Promise.all([
          hashtagService.clearPostHashtags(postId, session),
          commentRepository.softDeleteByPostId(postId, session),
          reactionRepository.deleteByTarget(
            ReactionTargetType.POST,
            postId,
            session
          ),
          reactionRepository.deleteByTargets(
            ReactionTargetType.COMMENT,
            commentIds,
            session
          ),
        ]);
      });

      if (!deleted) {
        throw new AppError(
          POST_MESSAGES.POST_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ErrorCode.POST_NOT_FOUND
        );
      }
    } finally {
      await session.endSession();
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

  async toggleRegistration(
    postId: string,
    workerId: string
  ): Promise<{ registered: boolean; registrations_count: number }> {
    const post = await postRepository.findActiveById(postId);
    if (!post) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }

    const worker = await userRepository.findById(workerId);
    if (!worker?.worker_profile) {
      throw new AppError(
        POST_REGISTRATION_MESSAGES.WORKER_PROFILE_REQUIRED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.POST_REGISTRATION_WORKER_PROFILE_REQUIRED
      );
    }

    if (postAuthorIdToString(post.author_id) === workerId) {
      throw new AppError(
        POST_REGISTRATION_MESSAGES.SELF_REGISTER_NOT_ALLOWED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.POST_REGISTRATION_SELF_REGISTER_NOT_ALLOWED
      );
    }

    const { registered } = await postRegistrationRepository.toggle(
      postId,
      workerId
    );
    const registrations_count =
      await postRegistrationRepository.countByPost(postId);

    return { registered, registrations_count };
  }

  async listRegistrations(
    postId: string,
    requesterId: string
  ): Promise<PostRegistrationsListPublic> {
    const post = await postRepository.findActiveById(postId);
    if (!post) {
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.POST_NOT_FOUND
      );
    }

    if (postAuthorIdToString(post.author_id) !== requesterId) {
      throw new AppError(
        POST_REGISTRATION_MESSAGES.UNAUTHORIZED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.POST_REGISTRATION_UNAUTHORIZED
      );
    }

    const data = await postRegistrationRepository.listByPost(postId);
    return { data, total: data.length };
  }

  async listRegisteredFeed(
    workerId: string,
    cursor?: string,
    limit = 10
  ): Promise<CursorPaginatedResponse<PostPublic>> {
    const postIds = await postRegistrationRepository.listPostIdsByWorker(workerId);
    if (postIds.length === 0) {
      return { data: [], next_cursor: null, has_more: false };
    }

    // Cursor encodes index into the postIds list for stable pagination
    const startIndex = cursor ? parseInt(cursor, 10) : 0;
    const actualLimit = Math.min(limit, 50);
    const pageIds = postIds.slice(startIndex, startIndex + actualLimit + 1);
    const hasMore = pageIds.length > actualLimit;
    const currentPageIds = pageIds.slice(0, actualLimit);

    if (currentPageIds.length === 0) {
      return { data: [], next_cursor: null, has_more: false };
    }

    const postObjectIds = currentPageIds.map((id) => new Types.ObjectId(id));
    const [mediaMap, hashtagMap, regCountMap] = await Promise.all([
      postMediaRepository.findByPostIds(postObjectIds),
      hashtagRepository.findHashtagIdsByPostIds(postObjectIds),
      postRegistrationRepository.countByPosts(postObjectIds),
    ]);

    const posts = await Promise.all(
      postObjectIds.map((oid) => postRepository.findActiveByIdLean(oid.toString()))
    );

    const enriched: PostPublic[] = [];
    for (const post of posts) {
      if (!post) continue;
      const id = (post._id as Types.ObjectId).toString();
      const media = mediaMap.get(id) ?? [];
      const hashtags = hashtagMap.get(id) ?? [];
      enriched.push(
        buildPostPublic(
          post as unknown as LeanPostWithAuthor,
          media,
          hashtags,
          emptyReactionSummary(),
          regCountMap.get(id) ?? 0,
          true
        )
      );
    }

    const nextIndex = startIndex + actualLimit;
    const nextCursor = hasMore ? String(nextIndex) : null;

    return { data: enriched, next_cursor: nextCursor, has_more: hasMore };
  }
}

export const postService = new PostService();
