import mongoose from "mongoose";
import {
  walletBalanceRepository,
  walletRepository,
} from "../../repositories/wallet";
import { notificationEventService } from "../notification";
import { logger } from "../../utils/logger";

export interface WalletBalanceReconciliationMismatch {
  user_id: string;
  stored_balance: number | null;
  calculated_balance: number | null;
  error?: string;
}

export interface WalletBalanceReconciliationSummary {
  scanned_count: number;
  reconciled_count: number;
  failed_count: number;
  mismatches: WalletBalanceReconciliationMismatch[];
}

export class WalletReconciliationService {
  async reconcileBalances(): Promise<WalletBalanceReconciliationSummary> {
    const userIds = await this.getCandidateUserIds();
    const summary: WalletBalanceReconciliationSummary = {
      scanned_count: userIds.length,
      reconciled_count: 0,
      failed_count: 0,
      mismatches: [],
    };

    for (const userId of userIds) {
      try {
        const mismatch = await this.reconcileUserBalance(userId);
        if (mismatch) {
          summary.reconciled_count += 1;
          summary.mismatches.push(mismatch);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown reconcile error";
        summary.failed_count += 1;
        summary.mismatches.push({
          user_id: userId,
          stored_balance: null,
          calculated_balance: null,
          error: message,
        });
        logger.error("Failed to reconcile wallet balance", { userId, error });
      }
    }

    if (summary.reconciled_count > 0 || summary.failed_count > 0) {
      logger.error("ALERT: wallet balance reconciliation found mismatches", {
        scanned_count: summary.scanned_count,
        reconciled_count: summary.reconciled_count,
        failed_count: summary.failed_count,
        mismatches: summary.mismatches.slice(0, 20),
      });

      void notificationEventService
        .walletBalanceReconciliationAlert(summary)
        .catch((error) =>
          logger.error("Wallet reconciliation alert failed:", error)
        );
    }

    return summary;
  }

  private async getCandidateUserIds(): Promise<string[]> {
    const [walletUserIds, transactionUserIds] = await Promise.all([
      walletBalanceRepository.findAllUserIds(),
      walletRepository.findUserIdsWithSuccessfulTransactions(),
    ]);

    return Array.from(new Set([...walletUserIds, ...transactionUserIds]));
  }

  private async reconcileUserBalance(
    userId: string
  ): Promise<WalletBalanceReconciliationMismatch | null> {
    const session = await mongoose.startSession();

    try {
      let mismatch: WalletBalanceReconciliationMismatch | null = null;

      await session.withTransaction(async () => {
        const wallet = await walletBalanceRepository.findByUserId(
          userId,
          session
        );
        const calculatedBalance = await walletRepository.calculateUserBalance(
          userId,
          session
        );
        const storedBalance = wallet?.balance ?? null;

        if (
          storedBalance === calculatedBalance ||
          (storedBalance === null && calculatedBalance === 0)
        ) {
          return;
        }

        await walletBalanceRepository.createOrUpdate(
          userId,
          calculatedBalance,
          session
        );

        mismatch = {
          user_id: userId,
          stored_balance: storedBalance,
          calculated_balance: calculatedBalance,
        };
      });

      return mismatch;
    } finally {
      await session.endSession();
    }
  }
}

export const walletReconciliationService = new WalletReconciliationService();
