import { PricingPlanCode } from "../../constants/pricing";
import { User } from "../../models/auth/user.model";
import { UserSubscriptionHistory } from "../../models/pricing";
import {
  SubscriptionEventStatus,
  SubscriptionEventType,
} from "../../types/pricing";

const DAY_MS = 24 * 60 * 60 * 1000;

type DashboardAnalyticsQuery = {
  start_date?: Date;
  end_date?: Date;
};

type DailyCount = {
  date: string;
  count: number;
};

type PackageRegistrationByPlan = {
  plan_code: PricingPlanCode;
  count: number;
  percentage: number;
};

type PackageRegistrationByDate = {
  date: string;
  standard: number;
  gold: number;
  diamond: number;
  total: number;
};

export type DashboardAnalytics = {
  total_users: number;
  new_users: number;
  user_registrations_by_date: DailyCount[];
  package_registrations_total: number;
  package_registrations_by_plan: PackageRegistrationByPlan[];
  package_registrations_by_date: PackageRegistrationByDate[];
};

function startOfUtcDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function endOfUtcDay(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(23, 59, 59, 999);
  return next;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function roundRate(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildDateRange(query: DashboardAnalyticsQuery) {
  const endDate = endOfUtcDay(query.end_date ?? new Date());
  const startDate = startOfUtcDay(
    query.start_date ?? new Date(endDate.getTime() - 29 * DAY_MS)
  );

  return { startDate, endDate };
}

class DashboardService {
  async getAnalytics(
    query: DashboardAnalyticsQuery
  ): Promise<DashboardAnalytics> {
    const { startDate, endDate } = buildDateRange(query);
    const createdAtFilter = { $gte: startDate, $lte: endDate };

    const [
      totalUsers,
      newUsers,
      userRegistrations,
      packageUpgrades,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ created_at: createdAtFilter }),
      User.aggregate<{ _id: string; count: number }>([
        { $match: { created_at: createdAtFilter } },
        {
          $group: {
            _id: {
              $dateToString: {
                date: "$created_at",
                format: "%Y-%m-%d",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      UserSubscriptionHistory.aggregate<{
        _id: { date: string; plan_code: PricingPlanCode };
        count: number;
      }>([
        {
          $match: {
            event_type: SubscriptionEventType.UPGRADE,
            status: SubscriptionEventStatus.SUCCESS,
            created_at: createdAtFilter,
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  date: "$created_at",
                  format: "%Y-%m-%d",
                },
              },
              plan_code: "$to_plan_code",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),
    ]);

    const userRegistrationMap = new Map(
      userRegistrations.map((item) => [item._id, item.count])
    );
    const packageDateMap = new Map<string, PackageRegistrationByDate>();
    const planCountMap = new Map<PricingPlanCode, number>(
      Object.values(PricingPlanCode).map((planCode) => [planCode, 0])
    );

    for (
      let cursor = new Date(startDate);
      cursor <= endDate;
      cursor = new Date(cursor.getTime() + DAY_MS)
    ) {
      const date = formatDateKey(cursor);
      const standardCount = userRegistrationMap.get(date) ?? 0;

      packageDateMap.set(date, {
        date,
        standard: standardCount,
        gold: 0,
        diamond: 0,
        total: standardCount,
      });
      planCountMap.set(
        PricingPlanCode.STANDARD,
        (planCountMap.get(PricingPlanCode.STANDARD) ?? 0) + standardCount
      );
    }

    for (const item of packageUpgrades) {
      const planCode = item._id.plan_code;
      const date = item._id.date;
      const bucket = packageDateMap.get(date);

      if (!bucket) continue;
      if (planCode === PricingPlanCode.GOLD) {
        bucket.gold += item.count;
      }
      if (planCode === PricingPlanCode.DIAMOND) {
        bucket.diamond += item.count;
      }
      bucket.total += item.count;
      planCountMap.set(planCode, (planCountMap.get(planCode) ?? 0) + item.count);
    }

    const packageRegistrationsTotal = Array.from(planCountMap.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      total_users: totalUsers,
      new_users: newUsers,
      user_registrations_by_date: Array.from(packageDateMap.values()).map(
        (item) => ({
          date: item.date,
          count: userRegistrationMap.get(item.date) ?? 0,
        })
      ),
      package_registrations_total: packageRegistrationsTotal,
      package_registrations_by_plan: Object.values(PricingPlanCode).map(
        (planCode) => {
          const count = planCountMap.get(planCode) ?? 0;
          return {
            plan_code: planCode,
            count,
            percentage:
              packageRegistrationsTotal > 0
                ? roundRate((count / packageRegistrationsTotal) * 100)
                : 0,
          };
        }
      ),
      package_registrations_by_date: Array.from(packageDateMap.values()),
    };
  }
}

export const dashboardService = new DashboardService();
