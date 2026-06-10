import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { DEFAULT_BOOST_CONFIG } from "../../constants/boost";
import { IBoostConfigDocument } from "../../types/boost/boost.types";

const boostConfigSchema = new Schema<IBoostConfigDocument>(
  {
    attendance_points: { type: Number, required: true, min: 0, default: DEFAULT_BOOST_CONFIG.attendance_points },
    attendance_streak_day: { type: Number, required: true, min: 1, default: DEFAULT_BOOST_CONFIG.attendance_streak_day },
    attendance_streak_bonus: { type: Number, required: true, min: 0, default: DEFAULT_BOOST_CONFIG.attendance_streak_bonus },
    attendance_monthly_bonus: { type: Number, required: true, min: 0, default: DEFAULT_BOOST_CONFIG.attendance_monthly_bonus },
    gold_package_points: { type: Number, required: true, min: 0, default: DEFAULT_BOOST_CONFIG.gold_package_points },
    diamond_package_points: { type: Number, required: true, min: 0, default: DEFAULT_BOOST_CONFIG.diamond_package_points },
    basic_boost_cost: { type: Number, required: true, min: 1, default: DEFAULT_BOOST_CONFIG.basic_boost_cost },
    basic_boost_duration_hours: { type: Number, required: true, min: 1, default: DEFAULT_BOOST_CONFIG.basic_boost_duration_hours },
    featured_boost_cost: { type: Number, required: true, min: 1, default: DEFAULT_BOOST_CONFIG.featured_boost_cost },
    featured_boost_duration_hours: { type: Number, required: true, min: 1, default: DEFAULT_BOOST_CONFIG.featured_boost_duration_hours },
    rotation_interval_minutes: { type: Number, required: true, min: 5, default: DEFAULT_BOOST_CONFIG.rotation_interval_minutes },
    updated_at: { type: Date, default: Date.now },
    updated_by: { type: Schema.Types.ObjectId, ref: modelsName.USER, default: null },
  },
  {
    timestamps: false,
    collection: modelsName.BOOST_CONFIG,
  }
);

boostConfigSchema.pre("save", function () {
  this.updated_at = new Date();
});

export const BoostConfig = mongoose.model<IBoostConfigDocument>(
  modelsName.BOOST_CONFIG,
  boostConfigSchema
);
