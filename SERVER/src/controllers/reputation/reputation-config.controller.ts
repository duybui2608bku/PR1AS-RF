import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { reputationConfigService } from "../../services/reputation/reputation-config.service";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import {
  updateReputationConfigSchema,
  reputationConfigKeySchema,
} from "../../validations/reputation/reputation-config.validation";
import { R, validateWithSchema } from "../../utils";
import { COMMON_MESSAGES } from "../../constants/messages";

export class ReputationConfigController {
  async getAll(_req: AuthRequest, res: Response): Promise<void> {
    const configs = await reputationConfigService.getAllConfigs();
    R.success(res, configs, "Reputation configs fetched successfully", _req);
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const key = validateWithSchema(
      reputationConfigKeySchema,
      req.params.key,
      COMMON_MESSAGES.BAD_REQUEST
    ) as ReputationConfigKey;

    const { value } = validateWithSchema(
      updateReputationConfigSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const adminId = req.user!.sub;
    const updated = await reputationConfigService.updateConfig(key, value, adminId);
    R.success(res, updated, "Reputation config updated successfully", req);
  }
}

export const reputationConfigController = new ReputationConfigController();
