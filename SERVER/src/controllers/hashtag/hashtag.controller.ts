import { Request, Response } from "express";
import { hashtagService } from "../../services/hashtag/hashtag.service";
import { trendingQuerySchema } from "../../validations/hashtag/hashtag.validation";
import { COMMON_MESSAGES, HASHTAG_MESSAGES } from "../../constants/messages";
import { R, validateWithSchema } from "../../utils";
import { TrendingWindowKey } from "../../constants/hashtag";

export class HashtagController {
  async getTrending(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(
      trendingQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const items = await hashtagService.getTrending({
      window: query.window as TrendingWindowKey,
      limit: query.limit,
    });
    R.success(res, { items }, HASHTAG_MESSAGES.TRENDING_FETCHED, req);
  }
}

export const hashtagController = new HashtagController();
