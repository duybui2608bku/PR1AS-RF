import { userRepository } from "../../repositories/auth/user.repository";
import { notificationEventService } from "../notification";
import { reputationConfigService } from "./reputation-config.service";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import { logger } from "../../utils/logger";

export class ReputationService {
  async deductPoints(userId: string, points: number): Promise<void> {
    const result = await userRepository.adjustReputationScore(userId, -points);
    if (!result) return;
    const { previousScore, newScore } = result;

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

  async recoverPoints(userId: string, points: number): Promise<void> {
    await userRepository.adjustReputationScore(userId, points);
  }

  async bulkDailyRecovery(): Promise<number> {
    const recoveryPoints = await reputationConfigService.getValue(
      ReputationConfigKey.DAILY_RECOVERY_POINTS
    );
    return userRepository.incrementReputationScoreForAll(recoveryPoints);
  }
}

export const reputationService = new ReputationService();
