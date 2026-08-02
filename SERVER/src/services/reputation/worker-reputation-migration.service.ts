import { userRepository } from "../../repositories/auth/user.repository";
import { reviewRepository } from "../../repositories/review/review.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { reputationConfigService } from "./reputation-config.service";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import { computeProfileCompletenessScore } from "./worker-profile-completeness";
import { logger } from "../../utils/logger";

export interface WorkerMigrationResult {
  scanned: number;
  updated: number;
}

/**
 * One-time backfill for existing workers under the new worker-only reputation
 * model (Task 16). Recomputes each worker's score from what can be inferred
 * right now — profile completeness, review history, completed-booking count —
 * and deliberately does NOT retroactively apply cancellation-tier/report/
 * late-completion penalties, since those are only meaningful going forward.
 */
export class WorkerReputationMigrationService {
  async runManual(options: { apply: boolean }): Promise<WorkerMigrationResult> {
    const [
      photoBonus,
      minPhotos,
      perFieldBonus,
      reviewReceivedBonus,
      fiveStarBonus,
      jobCompletionBonus,
      lowReviewThreshold,
    ] = await Promise.all([
      reputationConfigService.getValue(ReputationConfigKey.PROFILE_PHOTOS_BONUS),
      reputationConfigService.getValue(
        ReputationConfigKey.MIN_PROFILE_PHOTOS_THRESHOLD
      ),
      reputationConfigService.getValue(
        ReputationConfigKey.PROFILE_INFO_FIELD_BONUS
      ),
      reputationConfigService.getValue(ReputationConfigKey.REVIEW_RECEIVED_BONUS),
      reputationConfigService.getValue(ReputationConfigKey.FIVE_STAR_REVIEW_BONUS),
      reputationConfigService.getValue(ReputationConfigKey.JOB_COMPLETION_BONUS),
      reputationConfigService.getValue(ReputationConfigKey.LOW_REVIEW_THRESHOLD),
    ]);
    void lowReviewThreshold; // read for parity with live config; countAndAverageForWorker uses the fixed <=2 cutoff, see repository comment

    const workers = await userRepository.findAllWorkersForMigration();
    let updated = 0;

    for (const worker of workers) {
      const workerId = worker._id.toString();

      const profileComponent = computeProfileCompletenessScore(
        worker.worker_profile,
        { photoBonus, minPhotos, perFieldBonus }
      );

      const [reviewStats, completedJobs] = await Promise.all([
        reviewRepository.countAndAverageForWorker(workerId),
        bookingRepository.countCompletedForWorker(workerId),
      ]);

      const reviewComponent =
        reviewStats.total * reviewReceivedBonus +
        reviewStats.fiveStarCount * fiveStarBonus -
        reviewStats.lowRatingCount * 10; // matches LOW_REVIEW_DEDUCTION new default

      const jobComponent = completedJobs * jobCompletionBonus;

      const totalScore = Math.max(
        0,
        Math.min(100, profileComponent + reviewComponent + jobComponent)
      );

      if (options.apply) {
        await userRepository.setReputationScoreAndComponent(
          workerId,
          totalScore,
          profileComponent
        );
      }

      logger.info("Worker reputation migration row", {
        workerId,
        profileComponent,
        reviewComponent,
        jobComponent,
        totalScore,
        applied: options.apply,
      });

      updated += 1;
    }

    return { scanned: workers.length, updated: options.apply ? updated : 0 };
  }
}

export const workerReputationMigrationService =
  new WorkerReputationMigrationService();
