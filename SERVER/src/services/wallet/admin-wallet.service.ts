import { walletRepository } from "../../repositories/wallet";
import {
  AdminTransactionHistoryQuery,
  AdminTransactionStatsResponse,
  TopUsersResponse,
  TransactionChartResponse,
  TransactionHistoryResponse,
} from "../../types/wallet";
import {
  DateRangePreset,
  PAGINATION_DEFAULTS,
  DATE_RANGE_OFFSETS,
  DATE_UNITS,
} from "../../constants/wallet";
import { AppError } from "../../utils/AppError";
import { WALLET_MESSAGES } from "../../constants/messages";
import dayjs from "dayjs";

export class AdminWalletService {
  private getDateRangeFromPreset(
    preset: DateRangePreset
  ): { startDate: Date; endDate: Date } {
    const now = dayjs();

    switch (preset) {
      case DateRangePreset.TODAY:
        return {
          startDate: now.startOf(DATE_UNITS.DAY).toDate(),
          endDate: now.endOf(DATE_UNITS.DAY).toDate(),
        };
      case DateRangePreset.YESTERDAY:
        return {
          startDate: now
            .subtract(DATE_RANGE_OFFSETS.YESTERDAY_DAYS, DATE_UNITS.DAY)
            .startOf(DATE_UNITS.DAY)
            .toDate(),
          endDate: now
            .subtract(DATE_RANGE_OFFSETS.YESTERDAY_DAYS, DATE_UNITS.DAY)
            .endOf(DATE_UNITS.DAY)
            .toDate(),
        };
      case DateRangePreset.LAST_7_DAYS:
        return {
          startDate: now
            .subtract(DATE_RANGE_OFFSETS.LAST_7_DAYS_OFFSET, DATE_UNITS.DAY)
            .startOf(DATE_UNITS.DAY)
            .toDate(),
          endDate: now.endOf(DATE_UNITS.DAY).toDate(),
        };
      case DateRangePreset.LAST_14_DAYS:
        return {
          startDate: now
            .subtract(DATE_RANGE_OFFSETS.LAST_14_DAYS_OFFSET, DATE_UNITS.DAY)
            .startOf(DATE_UNITS.DAY)
            .toDate(),
          endDate: now.endOf(DATE_UNITS.DAY).toDate(),
        };
      case DateRangePreset.THIS_MONTH:
        return {
          startDate: now.startOf(DATE_UNITS.MONTH).toDate(),
          endDate: now.endOf(DATE_UNITS.DAY).toDate(),
        };
      default:
        throw AppError.badRequest(WALLET_MESSAGES.INVALID_DATE_RANGE);
    }
  }

  async getAdminTransactionHistory(
    query: AdminTransactionHistoryQuery & { skip: number }
  ): Promise<TransactionHistoryResponse> {
    const { transactions, total } =
      await walletRepository.findAllTransactions(query);

    return {
      transactions,
      total,
      page: query.page || PAGINATION_DEFAULTS.PAGE,
      limit: query.limit || PAGINATION_DEFAULTS.LIMIT,
    };
  }

  async getTransactionStats(
    dateRange: DateRangePreset
  ): Promise<AdminTransactionStatsResponse> {
    const { startDate, endDate } = this.getDateRangeFromPreset(dateRange);
    return walletRepository.getTransactionStats(startDate, endDate);
  }

  async getTopUsers(dateRange: DateRangePreset): Promise<TopUsersResponse> {
    const { startDate, endDate } = this.getDateRangeFromPreset(dateRange);
    const users = await walletRepository.getTopUsers(startDate, endDate);
    return { users };
  }

  async getTransactionChartData(
    dateRange: DateRangePreset
  ): Promise<TransactionChartResponse> {
    const { startDate, endDate } = this.getDateRangeFromPreset(dateRange);
    const data = await walletRepository.getTransactionChartData(
      startDate,
      endDate
    );
    return { data };
  }
}
