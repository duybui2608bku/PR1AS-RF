import { Types } from "mongoose";
import { reactionRepository } from "../../repositories/reaction/reaction.repository";
import { postRepository } from "../../repositories/post/post.repository";
import { commentRepository } from "../../repositories/comment/comment.repository";
import {
  REACTION_TYPES,
  ReactionTargetType,
  ReactionType,
} from "../../constants/reaction";
import {
  ReactionSummary,
  UpsertReactionInput,
} from "../../types/reaction/reaction.types";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { REACTION_MESSAGES } from "../../constants/messages";
import { logger } from "../../utils/logger";

const buildEmptyCounts = (): Record<ReactionType, number> =>
  REACTION_TYPES.reduce(
    (acc, key) => {
      acc[key] = 0;
      return acc;
    },
    {} as Record<ReactionType, number>
  );

export class ReactionService {
  private async assertTargetExists(
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
    await this.assertTargetExists(input.target_type, input.target_id);

    const { created } = await reactionRepository.upsert(
      userId,
      input.target_type,
      input.target_id,
      input.type
    );

    if (created && input.target_type === ReactionTargetType.POST) {
      try {
        await postRepository.incrementReactionsCount(input.target_id, 1);
      } catch (error) {
        logger.error("Failed to increment post reactions_count", error);
      }
    }

    return this.getSummary(userId, input.target_type, input.target_id);
  }

  async remove(
    userId: string,
    targetType: ReactionTargetType,
    targetId: string
  ): Promise<ReactionSummary> {
    await this.assertTargetExists(targetType, targetId);

    const { removed } = await reactionRepository.remove(
      userId,
      targetType,
      targetId
    );

    if (removed && targetType === ReactionTargetType.POST) {
      try {
        await postRepository.incrementReactionsCount(targetId, -1);
      } catch (error) {
        logger.error("Failed to decrement post reactions_count", error);
      }
    }

    return this.getSummary(userId, targetType, targetId);
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
