import {
  walletRepository,
  walletBalanceRepository,
} from "../../repositories/wallet";
import { userRepository } from "../../repositories/auth/user.repository";
import {
  CreateDepositRequest,
  CreateDepositResponse,
  CreatePricingPaymentRequest,
  CreatePricingPaymentResponse,
  WalletBalanceResponse,
  TransactionHistoryQuery,
  TransactionHistoryResponse,
  SePayWebhookRequest,
  SePayWebhookResponse,
  PricingUpgradePurposeMeta,
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
import { PRICING_MESSAGES, WALLET_MESSAGES } from "../../constants/messages";
import { notificationEventService } from "../notification";
import { NotificationType } from "../../constants/notification";
import { logger } from "../../utils/logger";
import { config } from "../../config";
import crypto from "crypto";
import { SEPAY_CONSTANTS } from "../../constants/wallet";
import mongoose from "mongoose";
import { pricingService } from "../pricing/pricing.service";
import { PricingPlanCode } from "../../constants/pricing";
import { PricingPackage } from "../../models/pricing";

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

  async createPricingPayment(
    userId: string,
    request: CreatePricingPaymentRequest
  ): Promise<CreatePricingPaymentResponse> {
    const { target_plan_code, duration_months } = request;

    if (
      target_plan_code === PricingPlanCode.STANDARD ||
      !Object.values(PricingPlanCode).includes(
        target_plan_code as PricingPlanCode
      )
    ) {
      throw AppError.badRequest(PRICING_MESSAGES.PRICING_INVALID_TARGET_PLAN);
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound(WALLET_MESSAGES.WALLET_NOT_FOUND);
    }

    await pricingService.ensureDefaultPackages();
    const targetPackage = await PricingPackage.findOne({
      package_code: target_plan_code as PricingPlanCode,
      is_active: true,
    });
    if (!targetPackage) {
      throw AppError.badRequest(PRICING_MESSAGES.PRICING_PACKAGE_NOT_AVAILABLE);
    }

    const amount = targetPackage.price * duration_months;

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
      description: `Mua gói ${targetPackage.display_name} (${duration_months} tháng) - ${paymentCode}`,
      purpose: "pricing_upgrade",
      purpose_metadata: {
        target_plan_code,
        duration_months,
      },
    });

    logger.info("Created SePay pricing payment transaction", {
      transaction_id: transaction._id.toString(),
      user_id: userId,
      amount,
      target_plan_code,
      duration_months,
      payment_code: paymentCode,
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
      target_plan_code,
      duration_months,
      package_display_name: targetPackage.display_name,
    };
  }

  async handleSePayWebhook(
    webhook: SePayWebhookRequest
  ): Promise<SePayWebhookResponse> {
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
          title: "Nạp tiền thất bại",
          body: "Số tiền chuyển không khớp với số tiền yêu cầu nạp.",
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

    // Idempotent finalize: atomic CAS from non-SUCCESS → SUCCESS in a single
    // session, then credit the wallet balance atomically. If two webhook
    // retries race, only one of them wins finalizeSePayDepositIfPending and
    // only that one credits the balance. The partial unique index on
    // sepay_transaction_id provides a defence-in-depth against any duplicate
    // attempts to set the same SePay id on a different transaction record.
    const userId = String(transaction.user_id);
    const session = await mongoose.startSession();
    let creditedBalance: number | null = null;
    try {
      await session.withTransaction(async () => {
        const finalized = await walletRepository.finalizeSePayDepositIfPending(
          transaction._id.toString(),
          webhook,
          session
        );

        if (!finalized) {
          // Another concurrent webhook call already transitioned to SUCCESS.
          return;
        }

        const updatedWallet = await walletBalanceRepository.atomicCredit(
          userId,
          transaction.amount,
          session
        );
        creditedBalance = updatedWallet.balance;
      });
    } catch (error) {
      // Duplicate key on sepay_transaction_id_unique = another retry won.
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code?: number }).code === 11000
      ) {
        logger.info("SePay webhook duplicate key — already processed", {
          sepay_transaction_id: webhook.id,
        });
        return {
          success: true,
          status: "already_processed",
          payment_code: paymentCode,
          transaction_id: transaction._id.toString(),
          message: "SePay transaction was already processed (duplicate).",
        };
      }
      throw error;
    } finally {
      await session.endSession();
    }

    if (creditedBalance === null) {
      // Lost the race — re-read balance for response.
      const wallet = await walletBalanceRepository.findByUserId(userId);
      return {
        success: true,
        status: "already_processed",
        payment_code: paymentCode,
        transaction_id: transaction._id.toString(),
        balance: wallet?.balance ?? 0,
      };
    }

    void notificationEventService
      .walletEvent({
        userId,
        type: NotificationType.WALLET_DEPOSIT_SUCCESS,
        title: "Nạp tiền thành công",
        body: `Số dư ví của bạn đã được cập nhật.`,
        data: {
          transaction_id: transaction._id.toString(),
          amount: transaction.amount,
          balance: creditedBalance,
        },
        dedupeKey: `wallet-deposit-success:${transaction._id.toString()}`,
      })
      .catch((error) =>
        logger.error("Wallet deposit success notification failed:", error)
      );

    if (transaction.purpose === "pricing_upgrade" && transaction.purpose_metadata) {
      const meta = transaction.purpose_metadata as PricingUpgradePurposeMeta;
      void this.activatePricingPlanAfterPayment(
        userId,
        transaction._id.toString(),
        meta
      );
    }

    return {
      success: true,
      status: "processed",
      payment_code: paymentCode,
      transaction_id: transaction._id.toString(),
      balance: creditedBalance,
    };
  }

  private async activatePricingPlanAfterPayment(
    userId: string,
    transactionId: string,
    meta: PricingUpgradePurposeMeta
  ): Promise<void> {
    try {
      await pricingService.upgradePricing(userId, {
        target_plan_code: meta.target_plan_code as Exclude<PricingPlanCode, PricingPlanCode.STANDARD>,
        duration_months: meta.duration_months ?? 1,
        idempotency_key: `qr-pay:${transactionId}`,
      });

      logger.info("Pricing plan auto-activated after QR payment", {
        user_id: userId,
        transaction_id: transactionId,
        target_plan_code: meta.target_plan_code,
      });

      void notificationEventService
        .walletEvent({
          userId,
          type: NotificationType.WALLET_DEPOSIT_SUCCESS,
          title: "Gói cước đã được kích hoạt",
          body: `Gói ${meta.target_plan_code} của bạn đã được kích hoạt thành công.`,
          data: { transaction_id: transactionId, plan: meta.target_plan_code },
          dedupeKey: `pricing-activated:${transactionId}`,
        })
        .catch((err) =>
          logger.error("Pricing activation notification failed:", err)
        );
    } catch (error) {
      logger.error("Failed to auto-activate pricing plan after QR payment", {
        user_id: userId,
        transaction_id: transactionId,
        meta,
        error,
      });
    }
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

  async getWalletBalance(userId: string): Promise<WalletBalanceResponse> {
    // Parallel-fetch: user existence check and cached wallet balance in one
    // round-trip. Use the denormalized wallet.balance (maintained atomically
    // by atomicCredit/atomicDebit) to avoid a full transaction-sum aggregation
    // on every request.
    const [user, wallet] = await Promise.all([
      userRepository.findById(userId),
      walletBalanceRepository.findByUserId(userId),
    ]);
    if (!user) {
      throw AppError.notFound(WALLET_MESSAGES.WALLET_NOT_FOUND);
    }
    if (wallet) {
      return { balance: wallet.balance, user_id: userId };
    }
    // No wallet record yet (new user who has never deposited) — derive from
    // transaction history as a safe fallback.
    const calculatedBalance =
      await walletRepository.calculateUserBalance(userId);
    return { balance: calculatedBalance, user_id: userId };
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
}
