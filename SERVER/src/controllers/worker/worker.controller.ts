import { Request, Response } from "express";
import { workerService } from "../../services/worker/worker.service";
import { R, extractUserIdFromRequest } from "../../utils";
import { COMMON_MESSAGES, WORKER_MESSAGES } from "../../constants/messages";
import { validateWithSchema } from "../../utils/validator";
import { workerGroupedByServiceQuerySchema } from "../../validations/worker/worker-grouped-query.validation";
import { workerHashtagSearchQuerySchema } from "../../validations/worker/worker-hashtag-search.validation";
import { locationSuggestionsQuerySchema } from "../../validations/worker/location-suggestion.validation";
import { workerSuggestionQuerySchema } from "../../validations/worker/worker-suggestion.validation";
import {
  createWorkerBlackoutSchema,
  listWorkerBlackoutQuerySchema,
} from "../../validations/worker/worker-blackout.validation";
import { locationService } from "../../services/location/location.service";
import { AuthRequest } from "../../middleware/auth";

export class WorkerController {
  async searchByHashtag(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(
      workerHashtagSearchQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await workerService.searchByHashtag(
      query.q,
      query.page,
      query.limit
    );
    R.success(res, result);
  }

  async getWorkerById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const worker = await workerService.getWorkerById(id, req.user?.sub);
    R.success(res, worker, undefined, req);
  }

  async getWorkersGroupedByService(
    req: AuthRequest,
    res: Response
  ): Promise<void> {
    const query = validateWithSchema(
      workerGroupedByServiceQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await workerService.getWorkersGroupedByService(
      query,
      req.user?.sub
    );
    R.success(
      res,
      result,
      WORKER_MESSAGES.WORKERS_GROUPED_BY_SERVICE_FETCHED,
      req
    );
  }

  async getFavoriteWorkerIds(req: AuthRequest, res: Response): Promise<void> {
    const clientId = extractUserIdFromRequest(req);
    const workerIds = await workerService.getFavoriteWorkerIds(clientId);
    R.success(res, workerIds, WORKER_MESSAGES.FAVORITE_WORKERS_FETCHED, req);
  }

  async getFavoriteWorkers(req: AuthRequest, res: Response): Promise<void> {
    const clientId = extractUserIdFromRequest(req);
    const favorites = await workerService.getFavoriteWorkers(clientId);
    R.success(res, favorites, WORKER_MESSAGES.FAVORITE_WORKERS_FETCHED, req);
  }

  async addFavoriteWorker(req: AuthRequest, res: Response): Promise<void> {
    const clientId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const result = await workerService.addFavoriteWorker(clientId, id);
    R.success(res, result, WORKER_MESSAGES.FAVORITE_WORKER_ADDED, req);
  }

  async removeFavoriteWorker(req: AuthRequest, res: Response): Promise<void> {
    const clientId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const result = await workerService.removeFavoriteWorker(clientId, id);
    R.success(res, result, WORKER_MESSAGES.FAVORITE_WORKER_REMOVED, req);
  }

  async getWorkerSuggestions(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const query = validateWithSchema(
      workerSuggestionQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const suggestions = await workerService.getWorkerSuggestions(
      id,
      query.limit
    );
    R.success(
      res,
      suggestions,
      WORKER_MESSAGES.WORKER_SUGGESTIONS_FETCHED,
      req
    );
  }

  async getWorkerSchedule(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const schedule = await workerService.getWorkerSchedule(
      id,
      req.query.start_date ? String(req.query.start_date) : undefined,
      req.query.end_date ? String(req.query.end_date) : undefined
    );
    R.success(res, schedule, undefined, req);
  }

  async createMyBlackout(req: AuthRequest, res: Response): Promise<void> {
    const workerId = extractUserIdFromRequest(req);
    const body = validateWithSchema(createWorkerBlackoutSchema, req.body);
    const result = await workerService.createBlackout(workerId, body);
    R.success(res, result, undefined, req);
  }

  async listMyBlackouts(req: AuthRequest, res: Response): Promise<void> {
    const workerId = extractUserIdFromRequest(req);
    const query = validateWithSchema(
      listWorkerBlackoutQuerySchema,
      req.query
    );
    const now = new Date();
    const startDate =
      query.start_date ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate =
      query.end_date ?? new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const result = await workerService.listMyBlackouts(
      workerId,
      startDate,
      endDate
    );
    R.success(res, result, undefined, req);
  }

  async deleteMyBlackout(req: AuthRequest, res: Response): Promise<void> {
    const workerId = extractUserIdFromRequest(req);
    const { id } = req.params;
    await workerService.deleteBlackout(workerId, id);
    R.success(res, null, undefined, req);
  }

  async getLocationSuggestions(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(
      locationSuggestionsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const suggestions = await locationService.getLocationSuggestions(
      query.q,
      query.limit,
      req.get("accept-language")
    );
    R.success(
      res,
      suggestions,
      WORKER_MESSAGES.LOCATION_SUGGESTIONS_FETCHED,
      req
    );
  }
}

export const workerController = new WorkerController();
