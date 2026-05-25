import mongoose, { Types } from "mongoose";
import { reactionRepository } from "../../repositories/reaction/reaction.repository";
import { postRepository } from "../../repositories/post/post.repository";
import { commentRepository } from "../../repositories/comment/comment.repository";
import { moderationService } from "../moderation";
import {
  REACTION_TYPES,
  ReactionTargetType,
  ReactionType,
} from "../../constants/reaction";
import { PostVisibility } from "../../constants/post";
import {
  ReactionSummary,
  UpsertReactionInput,
} from "../../types/reaction/reaction.types";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { POST_MESSAGES, REACTION_MESSAGES } from "../../constants/messages";
import { logger } from "../../utils/logger";

const extractPostAuthorId = (authorId: unknown): string => {
  if (!authorId) return "";
  if (authorId instanceof Types.ObjectId) return authorId.toString();
  if (typeof authorId === "object" && authorId !== null && "_id" in authorId) {
    const id = (authorId as { _id: Types.ObjectId | string })._id;
    return id instanceof Types.ObjectId ? id.toString() : String(id);
  }
  return String(authorId);
};

const buildEmptyCounts = (): Record<ReactionType, number> =>
  REACTION_TYPES.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {} as Record<ReactionType, number>
  );

export class ReactionService {
  private async assertReactableTarget(
    viewerId: string,
    targetType: ReactionTargetType,
    targetId: string
  ): Promise<void> {
    if (!Types.ObjectId.isValid(targetId)) {
      throw new AppError(
        REACTION_MESSAGES.INVALID_TARGET,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.REACTION_INVALID_TARGET
      );
    }

    if (targetType === ReactionTargetType.POST) {
      const post = await postRepository.findActiveById(targetId);
      if (!post) {
        throw new AppError(
          REACTION_MESSAGES.TARGET_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ErrorCode.REACTION_TARGET_NOT_FOUND
        );
      }

      const authorId = extractPostAuthorId(post.author_id);
      // PRIVATE posts are only reactable by the author. Treat any other
      // viewer as if the post does not exist (404) so visibility is not
      // leaked through 403s.
      if (post.visibility === PostVisibility.PRIVATE && authorId !== viewerId) {
        throw new AppError(
          REACTION_MESSAGES.TARGET_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ErrorCode.REACTION_TARGET_NOT_FOUND
        );
      }

      // Honour profile-level blocks in both directions so reactions match
      // feed visibility — a blocked viewer cannot react to the author's
      // posts and vice versa.
      if (authorId && authorId !== viewerId) {
        const blocked = await moderationService.isProfileBlocked(
          viewerId,
          authorId
        );
        if (blocked) {
          throw new AppError(
            REACTION_MESSAGES.TARGET_NOT_FOUND,
            HTTP_STATUS.NOT_FOUND,
            ErrorCode.REACTION_TARGET_NOT_FOUND
          );
        }
      }
      return;
    }

    if (targetType === ReactionTargetType.COMMENT) {
      const comment = await commentRepository.findActiveById(targetId);
      if (!comment) {
        throw new AppError(
          REACTION_MESSAGES.TARGET_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ErrorCode.REACTION_TARGET_NOT_FOUND
        );
      }

      // Reacting to a comment requires the parent post to also be reachable
      // by the viewer; otherwise PRIVATE posts could be probed through
      // their comments.
      const parentPost = await postRepository.findActiveById(
        comment.post_id.toString()
      );
      if (!parentPost) {
        throw new AppError(
          REACTION_MESSAGES.TARGET_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ErrorCode.REACTION_TARGET_NOT_FOUND
        );
      }
      const parentAuthorId = extractPostAuthorId(parentPost.author_id);
      if (
        parentPost.visibility === PostVisibility.PRIVATE &&
        parentAuthorId !== viewerId
      ) {
        throw new AppError(
          REACTION_MESSAGES.TARGET_NOT_FOUND,
          HTTP_STATUS.NOT_FOUND,
          ErrorCode.REACTION_TARGET_NOT_FOUND
        );
      }
      return;
    }

    throw new AppError(
      REACTION_MESSAGES.INVALID_TARGET,
      HTTP_STATUS.BAD_REQUEST,
      ErrorCode.REACTION_INVALID_TARGET
    );
  }

  async upsert(
    userId: string,
    input: UpsertReactionInput
  ): Promise<ReactionSummary> {
    await this.assertReactableTarget(
      userId,
      input.target_type,
      input.target_id
    );

    // Wrap the reaction write and the post counter in a single transaction so
    // we cannot end up with a reaction row but an unincremented
    // post.reactions_count (which previously drifted forever — caught only by
    // a logger.error). If the counter fails the reaction is rolled back, so
    // the next attempt is well-defined.
    let created = false;
    try {
      await this.runInOptionalTransaction(async (session) => {
        const result = await reactionRepository.upsert(
          userId,
          input.target_type,
          input.target_id,
          input.type,
          session
        );
        created = result.created;
        if (created && input.target_type === ReactionTargetType.POST) {
          await postRepository.incrementReactionsCount(
            input.target_id,
            1,
            session
          );
        }
      });
    } catch (error) {
      // Surface a clear error: dropping the reaction silently (as the old
      // code did) leaves the UI stuck in an inconsistent state.
      logger.error("Reaction upsert transaction failed", error);
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR
      );
    }

    return this.getSummary(userId, input.target_type, input.target_id);
  }

  async remove(
    userId: string,
    targetType: ReactionTargetType,
    targetId: string
  ): Promise<ReactionSummary> {
    await this.assertReactableTarget(userId, targetType, targetId);

    let removed = false;
    try {
      await this.runInOptionalTransaction(async (session) => {
        const result = await reactionRepository.remove(
          userId,
          targetType,
          targetId,
          session
        );
        removed = result.removed;
        if (removed && targetType === ReactionTargetType.POST) {
          await postRepository.incrementReactionsCount(targetId, -1, session);
        }
      });
    } catch (error) {
      logger.error("Reaction remove transaction failed", error);
      throw new AppError(
        POST_MESSAGES.POST_NOT_FOUND,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR
      );
    }

    return this.getSummary(userId, targetType, targetId);
  }

  // Some local/test environments run a standalone mongod that does not
  // support transactions. We optimistically open a session, fall back to
  // sequential writes (logging) when the cluster refuses the transaction.
  private async runInOptionalTransaction(
    work: (session: mongoose.ClientSession | undefined) => Promise<void>
  ): Promise<void> {
    const session = await mongoose.startSession();
    try {
      try {
        await session.withTransaction(async () => {
          await work(session);
        });
        return;
      } catch (error) {
        const code = (error as { code?: number; codeName?: string })?.codeName;
        const transactionsUnsupported =
          code === "IllegalOperation" ||
          code === "NotImplemented" ||
          /Transaction numbers are only allowed on a replica set/i.test(
            (error as Error)?.message ?? ""
          );
        if (!transactionsUnsupported) throw error;
        logger.warn(
          "Mongo transactions unavailable; running reaction write without atomic guarantees"
        );
        await work(undefined);
      }
    } finally {
      await session.endSession();
    }
  }

  async getSummary(
    userId: string | null | undefined,
    targetType: ReactionTargetType,
    targetId: string
  ): Promise<ReactionSummary> {
    if (!Types.ObjectId.isValid(targetId)) {
      return {
        total: 0,
        counts: buildEmptyCounts(),
        my_reaction: null,
      };
    }

    const [counts, myReaction] = await Promise.all([
      reactionRepository.getCountsForTarget(targetType, targetId),
      userId
        ? reactionRepository
            .findByUserAndTarget(userId, targetType, targetId)
            .then((doc) => doc?.type ?? null)
        : Promise.resolve(null),
    ]);

    let total = 0;
    for (const value of Object.values(counts)) total += value;

    return {
      total,
      counts,
      my_reaction: myReaction,
    };
  }
}

export const reactionService = new ReactionService();
