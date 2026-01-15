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
  AdminTransactionHistoryQuery,
  AdminTransactionStatsResponse,
  TopUsersResponse,
  TransactionChartResponse,
} from "../../types/wallet";

import {
  TransactionType,
  TransactionStatus,
  WALLET_LIMITS,
  DateRangePreset,
} from "../../constants/wallet";

import { PaymentGateway } from "../../constants/wallet";

import { AppError } from "../../utils/AppError";

import { WALLET_MESSAGES } from "../../constants/messages";

import { buildDepositPaymentUrl, verifyPaymentReturn } from "../vnpay";

import mongoose from "mongoose";

import dayjs from "dayjs";

export const createDepositTransaction = async (
  userId: string,

  request: CreateDepositRequest,

  ipAddress: string
): Promise<CreateDepositResponse> => {
  const { amount } = request;

  // if (amount < WALLET_LIMITS.MIN_DEPOSIT_AMOUNT) {

  //   throw AppError.badRequest(WALLET_MESSAGES.DEPOSIT_AMOUNT_TOO_LOW, [

  //     {

  //       field: "amount",

  //       message: `Minimum deposit amount is ${WALLET_LIMITS.MIN_DEPOSIT_AMOUNT}`,

  //     },

  //   ]);

  // }

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

    description: `Deposit ${amount}`,
  });

  const paymentUrl = buildDepositPaymentUrl(
    amount,

    userId,

    transactionId,

    ipAddress
  );

  return {
    payment_url: paymentUrl,

    transaction_id: transaction._id.toString(),
  };
};

export const verifyDepositPayment = async (
  userId: string,

  queryParams: Record<string, string>
): Promise<void> => {
  const verifyResult = verifyPaymentReturn(queryParams);

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
    }

    throw AppError.badRequest(WALLET_MESSAGES.PAYMENT_VERIFICATION_FAILED, []);
  }

  const transaction = await walletRepository.findByTxnRef(
    verifyResult.transactionId
  );

  if (!transaction) {
    throw AppError.notFound(WALLET_MESSAGES.TRANSACTION_NOT_FOUND);
  }

  if (transaction.user_id !== userId) {
    throw AppError.forbidden(WALLET_MESSAGES.TRANSACTION_FAILED);
  }

  if (transaction.status === TransactionStatus.SUCCESS) {
    return;
  }

  if (verifyResult.responseCode !== "00") {
    await walletRepository.updateStatus(
      transaction._id.toString(),

      TransactionStatus.FAILED,

      queryParams
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
};

export const getWalletBalance = async (
  userId: string
): Promise<WalletBalanceResponse> => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw AppError.notFound(WALLET_MESSAGES.WALLET_NOT_FOUND);
  }
  const calculatedBalance = await walletRepository.calculateUserBalance(userId);
  const wallet = await walletBalanceRepository.findByUserId(userId);
  if (!wallet || wallet.balance !== calculatedBalance) {
    await walletBalanceRepository.createOrUpdate(userId, calculatedBalance);
    return {
      balance: calculatedBalance,
      user_id: userId,
    };
  }
  return {
    balance: wallet.balance,
    user_id: userId,
  };
};

export const getTransactionHistory = async (
  userId: string,

  query: TransactionHistoryQuery & { skip: number }
): Promise<TransactionHistoryResponse> => {
  const { transactions, total } = await walletRepository.findUserTransactions(
    userId,

    query
  );

  return {
    transactions,

    total,

    page: query.page || 1,

    limit: query.limit || 10,
  };
};

export const getAdminTransactionHistory = async (
  query: AdminTransactionHistoryQuery & { skip: number }
): Promise<TransactionHistoryResponse> => {
  const { transactions, total } =
    await walletRepository.findAllTransactions(query);

  return {
    transactions,
    total,
    page: query.page || 1,
    limit: query.limit || 10,
  };
};

const getDateRangeFromPreset = (
  preset: DateRangePreset
): { startDate: Date; endDate: Date } => {
  const now = dayjs();

  switch (preset) {
    case DateRangePreset.TODAY:
      return {
        startDate: now.startOf("day").toDate(),
        endDate: now.endOf("day").toDate(),
      };
    case DateRangePreset.YESTERDAY:
      return {
        startDate: now.subtract(1, "day").startOf("day").toDate(),
        endDate: now.subtract(1, "day").endOf("day").toDate(),
      };
    case DateRangePreset.LAST_7_DAYS:
      return {
        startDate: now.subtract(6, "day").startOf("day").toDate(),
        endDate: now.endOf("day").toDate(),
      };
    case DateRangePreset.LAST_14_DAYS:
      return {
        startDate: now.subtract(13, "day").startOf("day").toDate(),
        endDate: now.endOf("day").toDate(),
      };
    case DateRangePreset.THIS_MONTH:
      return {
        startDate: now.startOf("month").toDate(),
        endDate: now.endOf("day").toDate(),
      };
    default:
      throw AppError.badRequest(WALLET_MESSAGES.INVALID_DATE_RANGE);
  }
};

export const getTransactionStats = async (
  dateRange: DateRangePreset
): Promise<AdminTransactionStatsResponse> => {
  const { startDate, endDate } = getDateRangeFromPreset(dateRange);
  return walletRepository.getTransactionStats(startDate, endDate);
};

export const getTopUsers = async (
  dateRange: DateRangePreset
): Promise<TopUsersResponse> => {
  const { startDate, endDate } = getDateRangeFromPreset(dateRange);
  const users = await walletRepository.getTopUsers(startDate, endDate);
  return { users };
};

export const getTransactionChartData = async (
  dateRange: DateRangePreset
): Promise<TransactionChartResponse> => {
  const { startDate, endDate } = getDateRangeFromPreset(dateRange);
  const data = await walletRepository.getTransactionChartData(
    startDate,
    endDate
  );
  return { data };
};
