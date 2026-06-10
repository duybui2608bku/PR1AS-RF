import mongoose from "mongoose";
import { Attendance } from "../../models/boost/attendance.model";
import { IAttendanceDocument } from "../../types/boost/boost.types";

class AttendanceRepository {
  async findTodayForUser(userId: string, dateStr: string): Promise<IAttendanceDocument | null> {
    return Attendance.findOne({ user_id: new mongoose.Types.ObjectId(userId), date: dateStr });
  }

  async create(
    userId: string,
    dateStr: string,
    streak: number,
    pointsEarned: number,
    session?: mongoose.ClientSession
  ): Promise<IAttendanceDocument> {
    const [doc] = await Attendance.create(
      [{ user_id: new mongoose.Types.ObjectId(userId), date: dateStr, streak_at_time: streak, points_earned: pointsEarned }],
      { session }
    );
    return doc;
  }
}

export const attendanceRepository = new AttendanceRepository();
