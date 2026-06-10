import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { IAttendanceDocument } from "../../types/boost/boost.types";

const attendanceSchema = new Schema<IAttendanceDocument>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: modelsName.USER, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    streak_at_time: { type: Number, required: true, min: 1 },
    points_earned: { type: Number, required: true, min: 0 },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: modelsName.ATTENDANCE,
  }
);

// One check-in per worker per calendar day
attendanceSchema.index({ user_id: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendanceDocument>(
  modelsName.ATTENDANCE,
  attendanceSchema
);
