import { userRepository } from "../../repositories/auth/user.repository";
import { reputationHistoryRepository } from "../../repositories/reputation/reputation-history.repository";
import { notificationEventService } from "../notification";
import { reputationConfigService } from "./reputation-config.service";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import {
  ReputationHistoryQuery,
  ReputationHistoryReason,
} from "../../types/reputation/reputation-history.types";
import { PaginationHelper } from "../../utils";
import { logger } from "../../utils/logger";

export class ReputationService {
  async deductPoints(
    userId: string,
    points: number,
    reason = ReputationHistoryReason.MANUAL
  ): Promise<void> {
    const result = await userRepository.adjustReputationScore(userId, -points);
    if (!result) return;
    const { previousScore, newScore } = result;
    await reputationHistoryRepository.create({
      userId,
      delta: newScore - previousScore,
      previousScore,
      newScore,
      reason,
    });

    const warningThreshold = await reputationConfigService.getValue(
      ReputationConfigKey.WARNING_THRESHOLD
    );

    const shouldNotify =
      (previousScore >= warningThreshold && newScore < warningThreshold) ||
      (previousScore < warningThreshold && newScore < previousScore);

    if (shouldNotify) {
      void notificationEventService
        .reputationWarning(userId, newScore)
        .catch((err) =>
          logger.error("Reputation warning notification failed:", err)
        );
    }
  }

  async recoverPoints(
    userId: string,
    points: number,
    reason = ReputationHistoryReason.MANUAL
  ): Promise<void> {
    const result = await userRepository.adjustReputationScore(userId, points);
    if (!result) return;
    const { previousScore, newScore } = result;
    await reputationHistoryRepository.create({
      userId,
      delta: newScore - previousScore,
      previousScore,
      newScore,
      reason,
    });
  }

  async bulkDailyRecovery(): Promise<number> {
    const recoveryPoints = await reputationConfigService.getValue(
      ReputationConfigKey.DAILY_RECOVERY_POINTS
    );
    const candidates = await userRepository.findReputationRecoveryCandidates();
    let recoveredCount = 0;

    for (const user of candidates) {
      const userId = user._id.toString();
      const result = await userRepository.adjustReputationScore(
        userId,
        recoveryPoints
      );
      if (!result) continue;
      const { previousScore, newScore } = result;
      if (newScore === previousScore) continue;
      recoveredCount += 1;
      await reputationHistoryRepository.create({
        userId,
        delta: newScore - previousScore,
        previousScore,
        newScore,
        reason: ReputationHistoryReason.DAILY_RECOVERY,
      });
    }

    return recoveredCount;
  }

  async listHistory(userId: string, query: ReputationHistoryQuery) {
    const { histories, total } = await reputationHistoryRepository.listByUser(
      userId,
      query
    );
    return PaginationHelper.formatResponse(
      histories,
      query.page,
      query.limit,
      total
    );
  }
}

export const reputationService = new ReputationService();
