import cron from "node-cron";
import { walletService } from "../services/wallet/wallet.service";
import { withJobLock } from "../utils/job-lock";
import { logger } from "../utils/logger";

// Every minute — QR TTL is 10 minutes; a 1-minute backstop is fine because the
// read path lazily expires overdue deposits for immediate UI feedback.
const CRON = "* * * * *";
const JOB_NAME = "wallet-deposit-expiration";
const JOB_LOCK_TTL_MS = 5 * 60 * 1000;

let task: ReturnType<typeof cron.schedule> | null = null;

export function startWalletDepositExpirationJob(): void {
  if (task) return;
  task = cron.schedule(CRON, async () => {
    try {
      await withJobLock(JOB_NAME, { ttlMs: JOB_LOCK_TTL_MS }, () =>
        walletService.expirePendingDeposits()
      );
    } catch (error) {
      logger.error("Wallet deposit expiration job failed:", error);
    }
  });
  logger.info(`Wallet deposit expiration job scheduled with cron "${CRON}"`);
}

export function stopWalletDepositExpirationJob(): void {
  if (!task) return;
  task.stop();
  task = null;
  logger.info("Wallet deposit expiration job stopped");
}
