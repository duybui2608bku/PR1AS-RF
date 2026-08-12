import { userRepository } from "../../repositories/auth/user.repository";
import { reviewRepository } from "../../repositories/review/review.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { reputationConfigService } from "./reputation-config.service";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import { computeProfileCompletenessScore } from "./worker-profile-completeness";
import { Migration } from "../../models/migration";
import { withJobLock } from "../../utils/job-lock";
import { logger } from "../../utils/logger";

export interface WorkerMigrationResult {
  scanned: number;
  updated: number;
}

// Bump the suffix (v2, v3, ...) if the migration's scoring formula changes
// and needs to re-run against every worker again — a new name is treated as
// a brand-new, never-applied migration.
const WORKER_REPUTATION_MIGRATION_NAME = "worker-reputation-backfill-v1";
const LOCK_NAME = `migration:${WORKER_REPUTATION_MIGRATION_NAME}`;
// Generous TTL: this migration does 2 extra queries per worker (review
// stats + completed-booking count), so a large worker base can take a
// while — matches the scan-heavy jobs elsewhere in this codebase.
const LOCK_TTL_MS = 10 * 60 * 1000;

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
      lowReviewDeduction,
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
      reputationConfigService.getValue(ReputationConfigKey.LOW_REVIEW_DEDUCTION),
    ]);
    // Note: LOW_REVIEW_THRESHOLD itself is not fetched here — the rating cutoff
    // used to count "low" reviews is hardcoded to <=2 inside
    // reviewRepository.countAndAverageForWorker (see that method's comment for
    // why). LOW_REVIEW_DEDUCTION (the point value, independently toggleable) is
    // fetched live above so it stays in sync with the admin-configured value.

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
        reviewStats.lowRatingCount * lowReviewDeduction;

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

  // Boot-time entry point. Skips immediately if already applied, otherwise
  // runs under a cross-instance lock and records a marker so it runs exactly
  // once — the next server boot (this one or any other instance) sees the
  // marker and skips. Matches the pattern already established by
  // ServiceCatalogMigrationService.runOnBoot.
  async runOnBoot(): Promise<void> {
    const already = await Migration.exists({
      name: WORKER_REPUTATION_MIGRATION_NAME,
    });
    if (already) return;

    await withJobLock(LOCK_NAME, { ttlMs: LOCK_TTL_MS }, async () => {
      // Re-check inside the lock: another instance may have finished the
      // migration while we were waiting to acquire it.
      const stillPending = !(await Migration.exists({
        name: WORKER_REPUTATION_MIGRATION_NAME,
      }));
      if (!stillPending) return;

      logger.info(`[${WORKER_REPUTATION_MIGRATION_NAME}] starting migration`);
      const result = await this.runManual({ apply: true });
      await Migration.create({
        name: WORKER_REPUTATION_MIGRATION_NAME,
        applied_at: new Date(),
      });
      logger.info(
        `[${WORKER_REPUTATION_MIGRATION_NAME}] migration complete`,
        result
      );
    });
  }
}

export const workerReputationMigrationService =
  new WorkerReputationMigrationService();
