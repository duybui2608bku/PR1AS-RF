import {
  walletRepository,
  walletBalanceRepository,
} from "../../repositories/wallet";
import { userRepository } from "../../repositories/auth/user.repository";
import {
  CreateDepositRequest,
  CreateDepositResponse,
  WalletBalanceResponse,
  TransactionHistoryQuery,
  TransactionHistoryResponse,
} from "../../types/wallet";
import {
  TransactionType,
  TransactionStatus,
  WALLET_LIMITS,
  VNPayResponseCode,
  TRANSACTION_DESCRIPTIONS,
  PaymentGateway,
} from "../../constants/wallet";
import { AppError } from "../../utils/AppError";
import { WALLET_MESSAGES } from "../../constants/messages";
import { vnpayService } from "../vnpay";
import { notificationEventService } from "../notification";
import { NotificationType } from "../../constants/notification";
import { logger } from "../../utils/logger";
import mongoose from "mongoose";

export class UserWalletService {
  async createDepositTransaction(
    userId: string,
    request: CreateDepositRequest,
    ipAddress: string
  ): Promise<CreateDepositResponse> {
    const { amount } = request;

    if (amount > WALLET_LIMITS.MAX_DEPOSIT_AMOUNT) {
      throw AppError.badRequest(WALLET_MESSAGES.DEPOSIT_AMOUNT_TOO_HIGH, [
        {
          field: "amount",
          message: `Maximum deposit amount is ${WALLET_LIMITS.MAX_DEPOSIT_AMOUNT}`,
        },
      ]);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound(WALLET_MESSAGES.WALLET_NOT_FOUND);
    }

    const transactionId = new mongoose.Types.ObjectId().toString();

    const transaction = await walletRepository.create({
      user_id: userId,
      type: TransactionType.DEPOSIT,
      amount,
      status: TransactionStatus.PENDING,
      gateway: PaymentGateway.VNPAY,
      gateway_transaction_id: transactionId,
      description: `${TRANSACTION_DESCRIPTIONS.DEPOSIT_PREFIX} ${amount}`,
    });

    const paymentUrl = vnpayService.buildDepositPaymentUrl(
      amount,
      userId,
      transactionId,
      ipAddress
    );

    return {
      payment_url: paymentUrl,
      transaction_id: transaction._id.toString(),
    };
  }

  async verifyDepositPayment(
    userId: string,
    queryParams: Record<string, string>
  ): Promise<void> {
    const verifyResult = vnpayService.verifyPaymentReturn(queryParams);

    if (!verifyResult.isSuccess) {
      const transaction = await walletRepository.findByTxnRef(
        verifyResult.transactionId
      );

      if (transaction) {
        await walletRepository.updateStatus(
          transaction._id.toString(),
          TransactionStatus.FAILED,
          queryParams
        );
        void notificationEventService
          .walletEvent({
            userId: String(transaction.user_id),
            type: NotificationType.WALLET_DEPOSIT_FAILED,
            title: "Deposit failed",
            body: "Your wallet deposit could not be verified.",
            data: { transaction_id: transaction._id.toString() },
            dedupeKey: `wallet-deposit-failed:${transaction._id.toString()}`,
          })
          .catch((error) =>
            logger.error("Wallet deposit failure notification failed:", error)
          );
      }

      throw AppError.badRequest(WALLET_MESSAGES.PAYMENT_VERIFICATION_FAILED, []);
    }

    const transaction = await walletRepository.findByTxnRef(
      verifyResult.transactionId
    );

    if (!transaction) {
      throw AppError.notFound(WALLET_MESSAGES.TRANSACTION_NOT_FOUND);
    }

    const transactionUserId = String(transaction.user_id);
    if (transactionUserId !== userId) {
      throw AppError.forbidden(WALLET_MESSAGES.TRANSACTION_FAILED);
    }

    if (transaction.status === TransactionStatus.SUCCESS) {
      return;
    }

    if (verifyResult.responseCode !== VNPayResponseCode.SUCCESS) {
      await walletRepository.updateStatus(
        transaction._id.toString(),
        TransactionStatus.FAILED,
        queryParams
      );
      void notificationEventService
        .walletEvent({
          userId,
          type: NotificationType.WALLET_DEPOSIT_FAILED,
          title: "Deposit failed",
          body: "Your wallet deposit was not completed successfully.",
          data: { transaction_id: transaction._id.toString() },
          dedupeKey: `wallet-deposit-failed:${transaction._id.toString()}`,
        })
        .catch((error) =>
          logger.error("Wallet deposit failure notification failed:", error)
        );

      throw AppError.badRequest(WALLET_MESSAGES.TRANSACTION_FAILED, []);
    }

    await walletRepository.updateStatus(
      transaction._id.toString(),
      TransactionStatus.SUCCESS,
      queryParams
    );

    await walletRepository.updateGatewayTransactionId(
      transaction._id.toString(),
      verifyResult.gatewayTransactionId
    );

    const currentBalance = await walletRepository.calculateUserBalance(userId);
    await walletBalanceRepository.createOrUpdate(userId, currentBalance);

    void notificationEventService
      .walletEvent({
        userId,
        type: NotificationType.WALLET_DEPOSIT_SUCCESS,
        title: "Deposit successful",
        body: `Your wallet deposit of ${transaction.amount} was successful.`,
        data: {
          transaction_id: transaction._id.toString(),
          amount: transaction.amount,
          balance: currentBalance,
        },
        dedupeKey: `wallet-deposit-success:${transaction._id.toString()}`,
      })
      .catch((error) =>
        logger.error("Wallet deposit success notification failed:", error)
      );
  }

  async getWalletBalance(userId: string): Promise<WalletBalanceResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound(WALLET_MESSAGES.WALLET_NOT_FOUND);
    }
    const calculatedBalance =
      await walletRepository.calculateUserBalance(userId);
    const wallet = await walletBalanceRepository.findByUserId(userId);
    if (!wallet || wallet.balance !== calculatedBalance) {
      await walletBalanceRepository.createOrUpdate(userId, calculatedBalance);
      return { balance: calculatedBalance, user_id: userId };
    }
    return { balance: wallet.balance, user_id: userId };
  }

  async getTransactionHistory(
    userId: string,
    query: TransactionHistoryQuery
  ): Promise<TransactionHistoryResponse> {
    const { transactions, total } = await walletRepository.findUserTransactions(
      userId,
      query
    );
    return { transactions, total, page: query.page, limit: query.limit };
  }

  async holdBalanceForBooking(
    userId: string,
    amount: number,
    bookingId: string,
    description?: string
  ): Promise<string> {
    const currentBalance = await walletRepository.calculateUserBalance(userId);

    if (currentBalance < amount) {
      throw AppError.badRequest(WALLET_MESSAGES.INSUFFICIENT_BALANCE, []);
    }

    const transactionDescription =
      description ||
      `${TRANSACTION_DESCRIPTIONS.HOLD_BALANCE_PREFIX} ${bookingId}`;

    const transaction = await walletRepository.create({
      user_id: userId,
      type: TransactionType.PAYMENT,
      amount,
      status: TransactionStatus.SUCCESS,
      description: transactionDescription,
    });

    const updatedBalance = currentBalance - amount;
    await walletBalanceRepository.createOrUpdate(userId, updatedBalance);

    void notificationEventService
      .walletEvent({
        userId,
        type: NotificationType.WALLET_HOLD_CREATED,
        title: "Balance held for booking",
        body: `A wallet hold of ${amount} was created for your booking.`,
        data: { booking_id: bookingId, amount, balance: updatedBalance },
        dedupeKey: `wallet-hold:${bookingId}:${transaction._id.toString()}`,
      })
      .catch((error) =>
        logger.error("Wallet hold notification failed:", error)
      );

    return transaction._id.toString();
  }

  async refundBalanceToClient(
    userId: string,
    amount: number,
    bookingId: string,
    description?: string
  ): Promise<string> {
    const transactionDescription =
      description ||
      `${TRANSACTION_DESCRIPTIONS.REFUND_PREFIX} ${bookingId}`;

    const transaction = await walletRepository.create({
      user_id: userId,
      type: TransactionType.REFUND,
      amount,
      status: TransactionStatus.SUCCESS,
      description: transactionDescription,
    });

    const currentBalance = await walletRepository.calculateUserBalance(userId);
    const updatedBalance = currentBalance + amount;
    await walletBalanceRepository.createOrUpdate(userId, updatedBalance);

    void notificationEventService
      .walletEvent({
        userId,
        type: NotificationType.WALLET_REFUND_CREATED,
        title: "Refund received",
        body: `A refund of ${amount} was added to your wallet.`,
        data: { booking_id: bookingId, amount, balance: updatedBalance },
        dedupeKey: `wallet-refund:${bookingId}:${transaction._id.toString()}`,
      })
      .catch((error) =>
        logger.error("Wallet refund notification failed:", error)
      );

    return transaction._id.toString();
  }

  async releasePayoutToWorker(
    workerId: string,
    amount: number,
    bookingId: string,
    description?: string
  ): Promise<string> {
    const transactionDescription =
      description ||
      `${TRANSACTION_DESCRIPTIONS.PAYOUT_PREFIX} ${bookingId}`;

    const transaction = await walletRepository.create({
      user_id: workerId,
      type: TransactionType.PAYOUT,
      amount,
      status: TransactionStatus.SUCCESS,
      description: transactionDescription,
    });

    const currentBalance =
      await walletRepository.calculateUserBalance(workerId);
    const updatedBalance = currentBalance + amount;
    await walletBalanceRepository.createOrUpdate(workerId, updatedBalance);

    void notificationEventService
      .walletEvent({
        userId: workerId,
        type: NotificationType.WALLET_PAYOUT_CREATED,
        title: "Payout received",
        body: `A payout of ${amount} was added to your wallet.`,
        data: { booking_id: bookingId, amount, balance: updatedBalance },
        dedupeKey: `wallet-payout:${bookingId}:${transaction._id.toString()}`,
      })
      .catch((error) =>
        logger.error("Wallet payout notification failed:", error)
      );

    return transaction._id.toString();
  }
}
