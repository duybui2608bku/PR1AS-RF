import cron from "node-cron";
import { walletReconciliationService } from "../services/wallet/wallet-reconciliation.service";
import { withJobLock } from "../utils/job-lock";
import { logger } from "../utils/logger";

// Nightly at 02:30, offset from account deletion and reputation jobs.
const WALLET_RECONCILIATION_CRON = "30 2 * * *";
const JOB_NAME = "wallet-balance-reconciliation";
const JOB_LOCK_TTL_MS = 60 * 60 * 1000;

let walletReconciliationTask: ReturnType<typeof cron.schedule> | null = null;

export function startWalletReconciliationJob(): void {
  if (walletReconciliationTask) return;

  walletReconciliationTask = cron.schedule(
    WALLET_RECONCILIATION_CRON,
    async () => {
      try {
        const result = await withJobLock(
          JOB_NAME,
          { ttlMs: JOB_LOCK_TTL_MS },
          () => walletReconciliationService.reconcileBalances()
        );

        if (!result) return;

        if (result.reconciled_count > 0 || result.failed_count > 0) {
          logger.warn("Wallet reconciliation completed with changes", result);
        } else {
          logger.info("Wallet reconciliation completed with no mismatches", {
            scanned_count: result.scanned_count,
          });
        }
      } catch (error) {
        logger.error("Wallet reconciliation job failed:", error);
      }
    }
  );

  logger.info(
    `Wallet reconciliation job scheduled with cron "${WALLET_RECONCILIATION_CRON}"`
  );
}

export function stopWalletReconciliationJob(): void {
  if (!walletReconciliationTask) return;

  walletReconciliationTask.stop();
  walletReconciliationTask = null;
  logger.info("Wallet reconciliation job stopped");
}
