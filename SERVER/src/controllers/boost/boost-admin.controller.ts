import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { R, validateWithSchema, extractUserIdFromRequest } from "../../utils";
import { boostConfigService } from "../../services/boost/boost-config.service";
import { pointService } from "../../services/boost/point.service";
import {
  adminAdjustPointsSchema,
  updateBoostConfigSchema,
} from "../../validations/boost/boost.validation";
import { BOOST_MESSAGES, COMMON_MESSAGES } from "../../constants/messages";

class BoostAdminController {
  async getConfig(req: AuthRequest, res: Response): Promise<void> {
    const config = await boostConfigService.get();
    R.success(res, config, BOOST_MESSAGES.CONFIG_FETCHED, req);
  }

  async updateConfig(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const payload = validateWithSchema(updateBoostConfigSchema, req.body, COMMON_MESSAGES.BAD_REQUEST);
    const config = await boostConfigService.update(payload, adminId);
    R.success(res, config, BOOST_MESSAGES.CONFIG_UPDATED, req);
  }

  async adjustPoints(req: AuthRequest, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const payload = validateWithSchema(adminAdjustPointsSchema, req.body, COMMON_MESSAGES.BAD_REQUEST);
    const wallet = await pointService.adminAdjust(
      payload.user_id,
      payload.delta,
      payload.note,
      adminId
    );
    R.success(res, wallet, BOOST_MESSAGES.POINTS_ADJUSTED, req);
  }
}

export const boostAdminController = new BoostAdminController();
