import mongoose from "mongoose";
import { BoostStatus, BoostType, PointReason } from "../../constants/boost";

// ─── Document interfaces ───────────────────────────────────────────────────

export interface IBoostConfigDocument extends mongoose.Document {
  attendance_points: number;
  attendance_streak_day: number;
  attendance_streak_bonus: number;
  attendance_monthly_bonus: number;
  gold_package_points: number;
  diamond_package_points: number;
  basic_boost_cost: number;
  basic_boost_duration_hours: number;
  featured_boost_cost: number;
  featured_boost_duration_hours: number;
  rotation_interval_minutes: number;
  updated_at: Date;
  updated_by?: mongoose.Types.ObjectId | null;
}

export interface IWorkerPointWalletDocument extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  balance: number;
  total_earned: number;
  total_spent: number;
  attendance_streak: number;
  last_attendance_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface IPointHistoryDocument extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  delta: number;
  reason: PointReason;
  balance_after: number;
  meta: {
    admin_note?: string;
    boost_id?: string;
    admin_id?: string;
  };
  created_at: Date;
}

export interface IAttendanceDocument extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  streak_at_time: number;
  points_earned: number;
  created_at: Date;
}

export interface IWorkerBoostDocument extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  boost_type: BoostType;
  tier: number;
  cost_points: number;
  started_at: Date;
  expires_at: Date;
  status: BoostStatus;
  created_at: Date;
}

// ─── Response types ───────────────────────────────────────────────────────

export interface BoostConfigResponse {
  attendance_points: number;
  attendance_streak_day: number;
  attendance_streak_bonus: number;
  attendance_monthly_bonus: number;
  gold_package_points: number;
  diamond_package_points: number;
  basic_boost_cost: number;
  basic_boost_duration_hours: number;
  featured_boost_cost: number;
  featured_boost_duration_hours: number;
  rotation_interval_minutes: number;
  updated_at: Date;
}

export interface PointWalletResponse {
  balance: number;
  total_earned: number;
  total_spent: number;
  attendance_streak: number;
  last_attendance_date: Date | null;
}

export interface PointHistoryItem {
  id: string;
  delta: number;
  reason: PointReason;
  balance_after: number;
  meta: {
    admin_note?: string;
    boost_id?: string;
  };
  created_at: Date;
}

export interface AttendanceCheckInResponse {
  points_earned: number;
  streak: number;
  balance: number;
  streak_bonus_earned: number;
  monthly_bonus_earned: number;
  already_checked_in: boolean;
}

export interface BoostStatusResponse {
  is_active: boolean;
  boost_type: BoostType | null;
  expires_at: Date | null;
  seconds_remaining: number | null;
  boost_plan_enabled: boolean;
  monthly_boost_limit: number | null;
  current_month_boost_count: number;
  remaining_monthly_boosts: number | null;
  can_activate_boost: boolean;
}

export interface ActivateBoostResponse {
  boost_type: BoostType;
  expires_at: Date;
  points_spent: number;
  balance_after: number;
}

// ─── Input types ─────────────────────────────────────────────────────────

export interface UpdateBoostConfigInput {
  attendance_points?: number;
  attendance_streak_day?: number;
  attendance_streak_bonus?: number;
  attendance_monthly_bonus?: number;
  gold_package_points?: number;
  diamond_package_points?: number;
  basic_boost_cost?: number;
  basic_boost_duration_hours?: number;
  featured_boost_cost?: number;
  featured_boost_duration_hours?: number;
  rotation_interval_minutes?: number;
}

export interface AdminAdjustPointsInput {
  user_id: string;
  delta: number;
  note: string;
}

export interface ActivateBoostInput {
  boost_type: BoostType;
}

// Lightweight shape returned when the repository joins boost info onto workers
export interface WorkerBoostInfo {
  user_id: string;
  tier: number;
  expires_at: Date;
}
