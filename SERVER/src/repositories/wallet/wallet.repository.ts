import { WalletTransaction } from "../../models/wallet";
import {
  IWalletTransactionDocument,
  TransactionHistoryQuery,
  AdminTransactionStatsResponse,
  TopUserTransaction,
  ChartDataPoint,
} from "../../types/wallet";
import {
  TransactionType,
  TransactionStatus,
  TOP_USERS_LIMIT,
} from "../../constants/wallet";
import { modelsName } from "../../models/models.name";

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
        .populate("user_id")
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

  async getTransactionStats(
    startDate: Date,
    endDate: Date
  ): Promise<AdminTransactionStatsResponse> {
    const dateFilter = {
      created_at: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    const [typeStats, statusStats] = await Promise.all([
      WalletTransaction.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            total_amount: { $sum: "$amount" },
          },
        },
      ]),
      WalletTransaction.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const typeStatsMap = typeStats.reduce(
      (
        acc: Record<string, { count: number; total_amount: number }>,
        item: { _id: string; count: number; total_amount: number }
      ) => {
        acc[item._id] = { count: item.count, total_amount: item.total_amount };
        return acc;
      },
      {}
    );

    const statusStatsMap = statusStats.reduce(
      (
        acc: Record<string, { count: number }>,
        item: { _id: string; count: number }
      ) => {
        acc[item._id] = { count: item.count };
        return acc;
      },
      {}
    );

    const totalTransactions = Object.values(statusStatsMap).reduce(
      (sum, item) => sum + item.count,
      0
    );

    return {
      total_transactions: totalTransactions,
      deposit: typeStatsMap[TransactionType.DEPOSIT] || {
        count: 0,
        total_amount: 0,
      },
      withdraw: typeStatsMap[TransactionType.WITHDRAW] || {
        count: 0,
        total_amount: 0,
      },
      payment: typeStatsMap[TransactionType.PAYMENT] || {
        count: 0,
        total_amount: 0,
      },
      refund: typeStatsMap[TransactionType.REFUND] || {
        count: 0,
        total_amount: 0,
      },
      success: statusStatsMap[TransactionStatus.SUCCESS] || { count: 0 },
      pending: statusStatsMap[TransactionStatus.PENDING] || { count: 0 },
      failed: statusStatsMap[TransactionStatus.FAILED] || { count: 0 },
      cancelled: statusStatsMap[TransactionStatus.CANCELLED] || { count: 0 },
    };
  }

  async getTopUsers(
    startDate: Date,
    endDate: Date
  ): Promise<TopUserTransaction[]> {
    const result = await WalletTransaction.aggregate([
      {
        $match: {
          created_at: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$user_id",
          transaction_count: { $sum: 1 },
          total_amount: { $sum: "$amount" },
        },
      },
      { $sort: { transaction_count: -1 } },
      { $limit: TOP_USERS_LIMIT },
      {
        $lookup: {
          from: modelsName.USER,
          localField: "_id",
          foreignField: "_id",
          as: "user_info",
        },
      },
      { $unwind: { path: "$user_info", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          user_id: "$_id",
          full_name: { $ifNull: ["$user_info.full_name", "Unknown"] },
          email: { $ifNull: ["$user_info.email", ""] },
          avatar: { $ifNull: ["$user_info.avatar", null] },
          transaction_count: 1,
          total_amount: 1,
        },
      },
    ]);

    return result;
  }

  async getTransactionChartData(
    startDate: Date,
    endDate: Date
  ): Promise<ChartDataPoint[]> {
    const result = await WalletTransaction.aggregate([
      {
        $match: {
          created_at: {
            $gte: startDate,
            $lte: endDate,
          },
          status: TransactionStatus.SUCCESS,
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$created_at" },
            },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    const dateMap: Record<string, ChartDataPoint> = {};

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      dateMap[dateStr] = {
        date: dateStr,
        deposit: 0,
        withdraw: 0,
        payment: 0,
        refund: 0,
        total: 0,
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    result.forEach(
      (item: { _id: { date: string; type: string }; total: number }) => {
        const { date, type } = item._id;
        if (dateMap[date]) {
          const typeKey = type as keyof Pick<
            ChartDataPoint,
            "deposit" | "withdraw" | "payment" | "refund"
          >;
          dateMap[date][typeKey] = item.total;
          dateMap[date].total += item.total;
        }
      }
    );

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const walletRepository = new WalletRepository();
