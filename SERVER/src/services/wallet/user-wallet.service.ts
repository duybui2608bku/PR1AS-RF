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
  SePayWebhookRequest,
  SePayWebhookResponse,
} from "../../types/wallet";
import {
  TransactionType,
  TransactionStatus,
  WALLET_LIMITS,
  TRANSACTION_DESCRIPTIONS,
  PaymentGateway,
  SePayTransferType,
} from "../../constants/wallet";
import { AppError } from "../../utils/AppError";
import { WALLET_MESSAGES } from "../../constants/messages";
import { notificationEventService } from "../notification";
import { NotificationType } from "../../constants/notification";
import { logger } from "../../utils/logger";
import { config } from "../../config";
import crypto from "crypto";
import { SEPAY_CONSTANTS } from "../../constants/wallet";
import mongoose from "mongoose";

export class UserWalletService {
  async createDepositTransaction(
    userId: string,
    request: CreateDepositRequest
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

    const paymentCode = await this.generateSePayPaymentCode();
    const paymentContent = paymentCode;
    const qrUrl = this.buildSePayQrUrl(amount, paymentContent);

    const transaction = await walletRepository.create({
      user_id: userId,
      type: TransactionType.DEPOSIT,
      amount,
      status: TransactionStatus.PENDING,
      gateway: PaymentGateway.SEPAY,
      payment_code: paymentCode,
      payment_content: paymentContent,
      qr_url: qrUrl,
      bank_account_number: config.sepay.bankAccountNumber,
      bank_name: config.sepay.bankName,
      description: `${TRANSACTION_DESCRIPTIONS.DEPOSIT_PREFIX} ${amount} - ${paymentCode}`,
    });

    logger.info("Created SePay deposit transaction", {
      transaction_id: transaction._id.toString(),
      user_id: userId,
      amount,
      payment_code: paymentCode,
      bank_account_number: config.sepay.bankAccountNumber,
      bank_name: config.sepay.bankName,
      qr_url: qrUrl,
    });

    return {
      payment_url: qrUrl,
      qr_url: qrUrl,
      transaction_id: transaction._id.toString(),
      payment_code: paymentCode,
      payment_content: paymentContent,
      bank_account_number: config.sepay.bankAccountNumber,
      bank_name: config.sepay.bankName,
      amount,
    };
  }

  async handleSePayWebhook(
    webhook: SePayWebhookRequest,
    authorizationHeader?: string
  ): Promise<SePayWebhookResponse> {
    this.assertSePayWebhookAuthorized(authorizationHeader);

    if (webhook.transferType !== SePayTransferType.IN) {
      logger.info("Ignored non-incoming SePay webhook", {
        sepay_transaction_id: webhook.id,
        transfer_type: webhook.transferType,
      });
      return {
        success: true,
        status: "ignored_non_incoming",
        message: "Transfer type is not incoming.",
      };
    }

    const paymentCode = this.resolveSePayPaymentCode(webhook);

    if (!paymentCode) {
      logger.warn("Ignored SePay webhook without a payment code", {
        sepay_transaction_id: webhook.id,
        content: webhook.content,
        description: webhook.description,
      });
      return {
        success: true,
        status: "ignored_missing_payment_code",
        message: "No payment code was found in code/content/description.",
      };
    }

    const existingTransaction = await walletRepository.findBySePayTransactionId(
      webhook.id
    );
    if (existingTransaction?.status === TransactionStatus.SUCCESS) {
      return {
        success: true,
        status: "already_processed",
        payment_code: paymentCode,
        transaction_id: existingTransaction._id.toString(),
        message: "SePay transaction was already processed.",
      };
    }

    const transaction =
      existingTransaction ||
      (await walletRepository.findByPaymentCode(paymentCode));

    if (!transaction) {
      logger.warn("Ignored SePay webhook because payment code was not found", {
        sepay_transaction_id: webhook.id,
        payment_code: paymentCode,
        transfer_amount: webhook.transferAmount,
      });
      return {
        success: true,
        status: "ignored_transaction_not_found",
        payment_code: paymentCode,
        message: "Payment code was not found in pending wallet transactions.",
      };
    }

    if (transaction.status === TransactionStatus.SUCCESS) {
      await walletRepository.applySePayWebhook(
        transaction._id.toString(),
        TransactionStatus.SUCCESS,
        webhook
      );
      return {
        success: true,
        status: "already_processed",
        payment_code: paymentCode,
        transaction_id: transaction._id.toString(),
        message: "Wallet transaction was already successful.",
      };
    }

    if (transaction.amount !== webhook.transferAmount) {
      await walletRepository.applySePayWebhook(
        transaction._id.toString(),
        TransactionStatus.FAILED,
        webhook
      );

      void notificationEventService
        .walletEvent({
          userId: String(transaction.user_id),
          type: NotificationType.WALLET_DEPOSIT_FAILED,
          title: "Deposit failed",
          body: "Your wallet deposit amount does not match the transfer amount.",
          data: { transaction_id: transaction._id.toString() },
          dedupeKey: `wallet-deposit-failed:${transaction._id.toString()}`,
        })
        .catch((error) =>
          logger.error("Wallet deposit failure notification failed:", error)
        );

      return {
        success: true,
        status: "amount_mismatch",
        payment_code: paymentCode,
        transaction_id: transaction._id.toString(),
        message: `Expected ${transaction.amount}, received ${webhook.transferAmount}.`,
      };
    }

    await walletRepository.applySePayWebhook(
      transaction._id.toString(),
      TransactionStatus.SUCCESS,
      webhook
    );

    const userId = String(transaction.user_id);
    const currentBalance = await walletRepository.calculateUserBalance(userId);
    await walletBalanceRepository.createOrUpdate(userId, currentBalance);

    void notificationEventService
      .walletEvent({
        userId,
        type: NotificationType.WALLET_DEPOSIT_SUCCESS,
        title: "Nạp tiền thành công",
        body: `Số dư ví của bạn đã được cập nhật.`,
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

    return {
      success: true,
      status: "processed",
      payment_code: paymentCode,
      transaction_id: transaction._id.toString(),
      balance: currentBalance,
    };
  }

  private async generateSePayPaymentCode(): Promise<string> {
    const prefix =
      config.sepay.paymentCodePrefix || SEPAY_CONSTANTS.PAYMENT_CODE_PREFIX;
    const min = 10 ** (SEPAY_CONSTANTS.PAYMENT_CODE_SUFFIX_LENGTH - 1);
    const max = 10 ** SEPAY_CONSTANTS.PAYMENT_CODE_SUFFIX_LENGTH;

    for (
      let attempt = 0;
      attempt < SEPAY_CONSTANTS.PAYMENT_CODE_MAX_GENERATE_ATTEMPTS;
      attempt += 1
    ) {
      const suffix = crypto.randomInt(min, max).toString();
      const paymentCode = `${prefix}${suffix}`;
      const existingTransaction =
        await walletRepository.findByPaymentCode(paymentCode);

      if (!existingTransaction) {
        return paymentCode;
      }
    }

    throw AppError.internal("Could not generate a unique SePay payment code.");
  }

  private resolveSePayPaymentCode(webhook: SePayWebhookRequest): string | null {
    if (webhook.code) {
      return webhook.code.trim();
    }

    const prefix =
      config.sepay.paymentCodePrefix || SEPAY_CONSTANTS.PAYMENT_CODE_PREFIX;
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const paymentCodePattern = new RegExp(`${escapedPrefix}\\d{3,10}`, "i");
    const matchedCode =
      webhook.content.match(paymentCodePattern)?.[0] ||
      webhook.description.match(paymentCodePattern)?.[0];

    return matchedCode?.toUpperCase() || null;
  }

  private buildSePayQrUrl(amount: number, paymentContent: string): string {
    if (!config.sepay.bankAccountNumber || !config.sepay.bankName) {
      throw AppError.internal(
        "SePay bank account config is missing. Please set SEPAY_BANK_ACCOUNT_NUMBER and SEPAY_BANK_NAME."
      );
    }

    const params = new URLSearchParams({
      acc: config.sepay.bankAccountNumber,
      bank: config.sepay.bankName,
      amount: String(amount),
      des: paymentContent,
    });

    return `${config.sepay.qrBaseUrl}?${params.toString()}`;
  }

  private assertSePayWebhookAuthorized(authorizationHeader?: string): void {
    if (!config.sepay.webhookApiKey) {
      return;
    }

    const expectedHeader = `Apikey ${config.sepay.webhookApiKey}`;
    if (authorizationHeader?.trim() !== expectedHeader) {
      throw AppError.unauthorized("Invalid SePay webhook API key");
    }
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

  async getWalletTransactionById(userId: string, transactionId: string) {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      throw AppError.badRequest(WALLET_MESSAGES.TRANSACTION_NOT_FOUND, []);
    }

    const transaction = await walletRepository.findById(transactionId);
    if (!transaction) {
      throw AppError.notFound(WALLET_MESSAGES.TRANSACTION_NOT_FOUND);
    }

    if (String(transaction.user_id) !== userId) {
      throw AppError.forbidden(WALLET_MESSAGES.TRANSACTION_FAILED);
    }

    return transaction;
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
