import mongoose from "mongoose";
import dayjs from "dayjs";
import { PointReason } from "../../constants/boost";
import { boostConfigRepository } from "../../repositories/boost/boost-config.repository";
import { attendanceRepository } from "../../repositories/boost/attendance.repository";
import { workerPointWalletRepository } from "../../repositories/boost/worker-point-wallet.repository";
import { pointHistoryRepository } from "../../repositories/boost/point-history.repository";
import { workerPointWalletRepository as walletRepo } from "../../repositories/boost/worker-point-wallet.repository";
import { AttendanceCheckInResponse } from "../../types/boost/boost.types";

class AttendanceService {
  private todayStr(): string {
    return dayjs().format("YYYY-MM-DD");
  }

  private yesterdayStr(): string {
    return dayjs().subtract(1, "day").format("YYYY-MM-DD");
  }

  async checkIn(userId: string): Promise<AttendanceCheckInResponse> {
    const todayStr = this.todayStr();
    const yesterdayStr = this.yesterdayStr();

    const existing = await attendanceRepository.findTodayForUser(userId, todayStr);
    if (existing) {
      const wallet = await walletRepo.findOrCreate(userId);
      return {
        points_earned: 0,
        streak: wallet.attendance_streak,
        balance: wallet.balance,
        streak_bonus_earned: 0,
        monthly_bonus_earned: 0,
        already_checked_in: true,
      };
    }

    const [config, wallet] = await Promise.all([
      boostConfigRepository.get(),
      walletRepo.findOrCreate(userId),
    ]);

    // Compute new streak: +1 if yesterday was checked in, else reset to 1
    const lastDate = wallet.last_attendance_date
      ? dayjs(wallet.last_attendance_date).format("YYYY-MM-DD")
      : null;
    const newStreak = lastDate === yesterdayStr ? wallet.attendance_streak + 1 : 1;

    // Calculate bonuses
    const streakBonus =
      newStreak % config.attendance_streak_day === 0 ? config.attendance_streak_bonus : 0;
    const monthlyBonus = newStreak === 30 ? config.attendance_monthly_bonus : 0;
    const totalPoints = config.attendance_points + streakBonus + monthlyBonus;

    const session = await mongoose.startSession();
    let finalBalance = wallet.balance;
    try {
      await session.withTransaction(async () => {
        await attendanceRepository.create(userId, todayStr, newStreak, totalPoints, session);

        await walletRepo.updateAttendanceMeta(userId, newStreak, new Date(), session);

        // Award base attendance points
        const afterBase = await workerPointWalletRepository.atomicAdjust(
          userId,
          config.attendance_points,
          session
        );
        if (!afterBase) throw new Error("Failed to award attendance points");
        await pointHistoryRepository.create(
          { userId, delta: config.attendance_points, reason: PointReason.ATTENDANCE, balanceAfter: afterBase.balance },
          session
        );
        finalBalance = afterBase.balance;

        // Award streak bonus
        if (streakBonus > 0) {
          const afterStreak = await workerPointWalletRepository.atomicAdjust(userId, streakBonus, session);
          if (!afterStreak) throw new Error("Failed to award streak bonus");
          await pointHistoryRepository.create(
            { userId, delta: streakBonus, reason: PointReason.ATTENDANCE_STREAK_BONUS, balanceAfter: afterStreak.balance },
            session
          );
          finalBalance = afterStreak.balance;
        }

        // Award monthly bonus
        if (monthlyBonus > 0) {
          const afterMonthly = await workerPointWalletRepository.atomicAdjust(userId, monthlyBonus, session);
          if (!afterMonthly) throw new Error("Failed to award monthly bonus");
          await pointHistoryRepository.create(
            { userId, delta: monthlyBonus, reason: PointReason.ATTENDANCE_MONTHLY_BONUS, balanceAfter: afterMonthly.balance },
            session
          );
          finalBalance = afterMonthly.balance;
        }
      });
    } finally {
      await session.endSession();
    }

    return {
      points_earned: totalPoints,
      streak: newStreak,
      balance: finalBalance,
      streak_bonus_earned: streakBonus,
      monthly_bonus_earned: monthlyBonus,
      already_checked_in: false,
    };
  }
}

export const attendanceService = new AttendanceService();
