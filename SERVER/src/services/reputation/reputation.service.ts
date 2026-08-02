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
import { IUserDocument, UserRole } from "../../types/auth/user.types";
import { computeProfileCompletenessScore } from "./worker-profile-completeness";

export class ReputationService {
  async deductPoints(
    userId: string,
    points: number,
    reason = ReputationHistoryReason.MANUAL,
    defaultScore = 100
  ): Promise<void> {
    const result = await userRepository.adjustReputationScore(
      userId,
      -points,
      defaultScore
    );
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
    reason = ReputationHistoryReason.MANUAL,
    defaultScore = 100
  ): Promise<void> {
    const result = await userRepository.adjustReputationScore(
      userId,
      points,
      defaultScore
    );
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
    const recoveryPoints = await reputationConfigService.getActiveValue(
      ReputationConfigKey.DAILY_RECOVERY_POINTS
    );
    if (recoveryPoints === null) {
      logger.info("Daily reputation recovery skipped: rule is disabled");
      return 0;
    }
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

  async awardJobCompletion(workerId: string): Promise<void> {
    const points = await reputationConfigService.getActiveValue(
      ReputationConfigKey.JOB_COMPLETION_BONUS
    );
    if (points === null) return;
    await this.recoverPoints(
      workerId,
      points,
      ReputationHistoryReason.JOB_COMPLETED,
      0
    );
  }

  async syncWorkerProfileCompleteness(user: IUserDocument): Promise<void> {
    if (!user.roles?.includes(UserRole.WORKER)) return;

    // PROFILE_PHOTOS_BONUS and PROFILE_INFO_FIELD_BONUS are toggleable
    // point-changing rules (TOGGLEABLE_REPUTATION_KEYS), so they must use
    // getActiveValue and treat a `null` (disabled) result as a 0 contribution
    // — mirroring every other point-changing hook in this codebase.
    // MIN_PROFILE_PHOTOS_THRESHOLD is a pure threshold (not toggleable) and
    // stays on getValue, per the existing convention.
    const [photoBonus, minPhotos, perFieldBonus] = await Promise.all([
      reputationConfigService.getActiveValue(
        ReputationConfigKey.PROFILE_PHOTOS_BONUS
      ),
      reputationConfigService.getValue(
        ReputationConfigKey.MIN_PROFILE_PHOTOS_THRESHOLD
      ),
      reputationConfigService.getActiveValue(
        ReputationConfigKey.PROFILE_INFO_FIELD_BONUS
      ),
    ]);

    const newComponent = computeProfileCompletenessScore(user.worker_profile, {
      photoBonus: photoBonus ?? 0,
      minPhotos,
      perFieldBonus: perFieldBonus ?? 0,
    });
    const previousComponent = user.meta_data?.reputation_profile_component ?? 0;
    const delta = newComponent - previousComponent;
    if (delta === 0) return;

    const userId = user._id.toString();
    const result = await userRepository.adjustReputationScore(userId, delta, 0);
    if (!result) return;

    await userRepository.setReputationProfileComponent(userId, newComponent);

    const { previousScore, newScore } = result;
    if (newScore === previousScore) return;
    await reputationHistoryRepository.create({
      userId,
      delta: newScore - previousScore,
      previousScore,
      newScore,
      reason: ReputationHistoryReason.PROFILE_COMPLETENESS,
    });
  }
}

export const reputationService = new ReputationService();
