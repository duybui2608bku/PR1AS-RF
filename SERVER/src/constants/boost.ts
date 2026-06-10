export enum BoostType {
  BASIC = "basic",
  FEATURED = "featured",
}

export enum BoostStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
}

export enum PointReason {
  ATTENDANCE = "attendance",
  ATTENDANCE_STREAK_BONUS = "attendance_streak_bonus",
  ATTENDANCE_MONTHLY_BONUS = "attendance_monthly_bonus",
  GOLD_PACKAGE = "gold_package",
  DIAMOND_PACKAGE = "diamond_package",
  BOOST_SPEND = "boost_spend",
  ADMIN_ADJUST = "admin_adjust",
}

// Tier number used for sort: lower = higher priority in results
export const BOOST_TIER: Record<BoostType, number> = {
  [BoostType.FEATURED]: 1,
  [BoostType.BASIC]: 2,
};

export const DEFAULT_BOOST_CONFIG = {
  attendance_points: 5,
  attendance_streak_day: 7,
  attendance_streak_bonus: 25,
  attendance_monthly_bonus: 100,
  gold_package_points: 50,
  diamond_package_points: 150,
  basic_boost_cost: 50,
  basic_boost_duration_hours: 6,
  featured_boost_cost: 400,
  featured_boost_duration_hours: 72,
  rotation_interval_minutes: 30,
} as const;
