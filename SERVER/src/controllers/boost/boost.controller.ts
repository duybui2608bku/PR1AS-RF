import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { R, validateWithSchema, extractUserIdFromRequest } from "../../utils";
import { attendanceService } from "../../services/boost/attendance.service";
import { boostService } from "../../services/boost/boost.service";
import { pointService } from "../../services/boost/point.service";
import { activateBoostSchema } from "../../validations/boost/boost.validation";
import { BOOST_MESSAGES, COMMON_MESSAGES } from "../../constants/messages";

class BoostController {
  async checkIn(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const result = await attendanceService.checkIn(userId);
    R.success(res, result, BOOST_MESSAGES.ATTENDANCE_CHECKED_IN, req);
  }

  async getPoints(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Number(req.query.offset) || 0;
    const [wallet, history] = await Promise.all([
      pointService.getWallet(userId),
      pointService.getHistory(userId, limit, offset),
    ]);
    R.success(res, { wallet, history }, BOOST_MESSAGES.POINTS_FETCHED, req);
  }

  async activateBoost(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const payload = validateWithSchema(activateBoostSchema, req.body, COMMON_MESSAGES.BAD_REQUEST);
    const result = await boostService.activate(userId, payload.boost_type);
    R.success(res, result, BOOST_MESSAGES.BOOST_ACTIVATED, req);
  }

  async getBoostStatus(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const status = await boostService.getStatus(userId);
    R.success(res, status, BOOST_MESSAGES.BOOST_STATUS_FETCHED, req);
  }
}

export const boostController = new BoostController();
