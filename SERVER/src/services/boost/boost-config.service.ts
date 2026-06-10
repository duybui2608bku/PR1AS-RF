import { boostConfigRepository } from "../../repositories/boost/boost-config.repository";
import { BoostConfigResponse, UpdateBoostConfigInput } from "../../types/boost/boost.types";

class BoostConfigService {
  async get(): Promise<BoostConfigResponse> {
    const config = await boostConfigRepository.get();
    return {
      attendance_points: config.attendance_points,
      attendance_streak_day: config.attendance_streak_day,
      attendance_streak_bonus: config.attendance_streak_bonus,
      attendance_monthly_bonus: config.attendance_monthly_bonus,
      gold_package_points: config.gold_package_points,
      diamond_package_points: config.diamond_package_points,
      basic_boost_cost: config.basic_boost_cost,
      basic_boost_duration_hours: config.basic_boost_duration_hours,
      featured_boost_cost: config.featured_boost_cost,
      featured_boost_duration_hours: config.featured_boost_duration_hours,
      rotation_interval_minutes: config.rotation_interval_minutes,
      updated_at: config.updated_at,
    };
  }

  async update(input: UpdateBoostConfigInput, adminId: string): Promise<BoostConfigResponse> {
    const config = await boostConfigRepository.update(input, adminId);
    return {
      attendance_points: config.attendance_points,
      attendance_streak_day: config.attendance_streak_day,
      attendance_streak_bonus: config.attendance_streak_bonus,
      attendance_monthly_bonus: config.attendance_monthly_bonus,
      gold_package_points: config.gold_package_points,
      diamond_package_points: config.diamond_package_points,
      basic_boost_cost: config.basic_boost_cost,
      basic_boost_duration_hours: config.basic_boost_duration_hours,
      featured_boost_cost: config.featured_boost_cost,
      featured_boost_duration_hours: config.featured_boost_duration_hours,
      rotation_interval_minutes: config.rotation_interval_minutes,
      updated_at: config.updated_at,
    };
  }
}

export const boostConfigService = new BoostConfigService();
