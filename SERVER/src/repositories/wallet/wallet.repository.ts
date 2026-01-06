import { WalletTransaction } from "../../models/wallet";
import {
  IWalletTransactionDocument,
  TransactionHistoryQuery,
} from "../../types/wallet";
import { TransactionType, TransactionStatus } from "../../constants/wallet";

export interface CreateTransactionInput {
  user_id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  gateway?: string;
  gateway_transaction_id?: string;
  gateway_response?: Record<string, unknown>;
  description?: string;
}

export interface FindTransactionsResult {
  transactions: IWalletTransactionDocument[];
  total: number;
}

export class WalletRepository {
  async create(
    data: CreateTransactionInput
  ): Promise<IWalletTransactionDocument> {
    const transaction = new WalletTransaction({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return transaction.save();
  }

  async findById(
    transactionId: string
  ): Promise<IWalletTransactionDocument | null> {
    return WalletTransaction.findById(transactionId);
  }

  async findByTransactionId(
    transactionId: string
  ): Promise<IWalletTransactionDocument | null> {
    return WalletTransaction.findOne({
      gateway_transaction_id: transactionId,
    });
  }

  async findByTxnRef(
    txnRef: string
  ): Promise<IWalletTransactionDocument | null> {
    return WalletTransaction.findOne({
      gateway_transaction_id: txnRef,
    });
  }

  async updateStatus(
    transactionId: string,
    status: TransactionStatus,
    gatewayResponse?: Record<string, unknown>
  ): Promise<IWalletTransactionDocument | null> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date(),
    };

    if (gatewayResponse) {
      updateData.gateway_response = gatewayResponse;
    }

    return WalletTransaction.findByIdAndUpdate(transactionId, updateData, {
      new: true,
    });
  }

  async updateGatewayTransactionId(
    transactionId: string,
    gatewayTransactionId: string
  ): Promise<IWalletTransactionDocument | null> {
    return WalletTransaction.findByIdAndUpdate(
      transactionId,
      {
        gateway_transaction_id: gatewayTransactionId,
        updated_at: new Date(),
      },
      { new: true }
    );
  }

  async findUserTransactions(
    userId: string,
    query: TransactionHistoryQuery & { skip: number }
  ): Promise<FindTransactionsResult> {
    const { skip, limit = 10, type, status } = query;

    const filter: Record<string, unknown> = {
      user_id: userId,
    };

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      WalletTransaction.countDocuments(filter),
    ]);

    return {
      transactions: transactions as IWalletTransactionDocument[],
      total,
    };
  }

  async findAllTransactions(
    query: TransactionHistoryQuery & { skip: number }
  ): Promise<FindTransactionsResult> {
    const { skip, limit = 10, type, status, user_id } = query;

    const filter: Record<string, unknown> = {};

    if (user_id) {
      filter.user_id = user_id;
    }

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      WalletTransaction.countDocuments(filter),
    ]);

    return {
      transactions: transactions as IWalletTransactionDocument[],
      total,
    };
  }

  async calculateUserBalance(userId: string): Promise<number> {
    const result = await WalletTransaction.aggregate([
      {
        $match: {
          user_id: userId,
          status: TransactionStatus.SUCCESS,
        },
      },
      {
        $group: {
          _id: "$type",
          total: {
            $sum: {
              $cond: [
                { $eq: ["$type", TransactionType.DEPOSIT] },
                "$amount",
                { $multiply: ["$amount", -1] },
              ],
            },
          },
        },
      },
    ]);

    const balance = result.reduce((sum, item) => sum + (item.total || 0), 0);

    return Math.max(0, balance);
  }
}

export const walletRepository = new WalletRepository();
