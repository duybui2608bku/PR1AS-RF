import { z } from "zod";
import { BoostType } from "../../constants/boost";

export const activateBoostSchema = z.object({
  boost_type: z.nativeEnum(BoostType),
});

export const adminAdjustPointsSchema = z.object({
  user_id: z.string().min(1),
  delta: z.number().int().refine((v) => v !== 0, { message: "delta must be non-zero" }),
  note: z.string().min(1).max(500),
});

export const updateBoostConfigSchema = z.object({
  attendance_points: z.number().int().min(0).optional(),
  attendance_streak_day: z.number().int().min(1).optional(),
  attendance_streak_bonus: z.number().int().min(0).optional(),
  attendance_monthly_bonus: z.number().int().min(0).optional(),
  gold_package_points: z.number().int().min(0).optional(),
  diamond_package_points: z.number().int().min(0).optional(),
  basic_boost_cost: z.number().int().min(1).optional(),
  basic_boost_duration_hours: z.number().int().min(1).optional(),
  featured_boost_cost: z.number().int().min(1).optional(),
  featured_boost_duration_hours: z.number().int().min(1).optional(),
  rotation_interval_minutes: z.number().int().min(5).optional(),
});
