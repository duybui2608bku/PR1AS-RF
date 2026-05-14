import { userRepository } from "../../repositories/auth/user.repository";
import { notificationEventService } from "../notification";
import { logger } from "../../utils/logger";

export class ReputationService {
  async deductPoints(userId: string, points: number): Promise<void> {
    const result = await userRepository.adjustReputationScore(userId, -points);
    if (!result) return;

    const { previousScore, newScore } = result;

    // Notify on first drop below 70, and on every subsequent deduction while already below 70
    const shouldNotify =
      (previousScore >= 70 && newScore < 70) ||
      (previousScore < 70 && newScore < previousScore);

    if (shouldNotify) {
      void notificationEventService
        .reputationWarning(userId, newScore)
        .catch((err) => logger.error("Reputation warning notification failed:", err));
    }
  }

  async recoverPoints(userId: string, points: number): Promise<void> {
    await userRepository.adjustReputationScore(userId, points);
  }

  async bulkDailyRecovery(): Promise<number> {
    return userRepository.incrementReputationScoreForAll(5);
  }
}

export const reputationService = new ReputationService();
