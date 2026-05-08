import { Request, Response } from "express";
import { z } from "zod";

import { COMMON_MESSAGES } from "../../constants/messages";
import { dashboardService } from "../../services/dashboard/dashboard.service";
import { R, validateWithSchema } from "../../utils";

const dashboardAnalyticsQuerySchema = z
  .object({
    start_date: z.coerce.date().optional(),
    end_date: z.coerce.date().optional(),
  })
  .refine(
    (data) =>
      !data.start_date || !data.end_date || data.start_date <= data.end_date,
    {
      message: "start_date must be before or equal to end_date",
      path: ["end_date"],
    }
  );

export class DashboardController {
  async getAnalytics(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(
      dashboardAnalyticsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const analytics = await dashboardService.getAnalytics(query);

    R.success(res, analytics, "Dashboard analytics fetched successfully", req);
  }
}

export const dashboardController = new DashboardController();
