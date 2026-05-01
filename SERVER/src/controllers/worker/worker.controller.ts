import { Request, Response } from "express";
import { workerService } from "../../services/worker/worker.service";
import { R } from "../../utils";
import { AppError } from "../../utils/AppError";
import {
  AUTH_MESSAGES,
  COMMON_MESSAGES,
  WORKER_MESSAGES,
} from "../../constants/messages";
import { validateWithSchema } from "../../utils/validator";
import { workerGroupedByServiceQuerySchema } from "../../validations/worker/worker-grouped-query.validation";
import { locationSuggestionsQuerySchema } from "../../validations/worker/location-suggestion.validation";
import { locationService } from "../../services/location/location.service";

export class WorkerController {
  async getWorkerById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const worker = await workerService.getWorkerById(id);
    if (!worker) {
      throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    }
    R.success(res, worker, undefined, req);
  }

  async getWorkersGroupedByService(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(
      workerGroupedByServiceQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await workerService.getWorkersGroupedByService(query);
    R.success(
      res,
      result,
      WORKER_MESSAGES.WORKERS_GROUPED_BY_SERVICE_FETCHED,
      req
    );
  }

  async getWorkerSchedule(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const startDate = req.query.start_date
      ? new Date(String(req.query.start_date))
      : new Date(new Date().setDate(1));
    const endDate = req.query.end_date
      ? new Date(String(req.query.end_date))
      : new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw AppError.badRequest(COMMON_MESSAGES.BAD_REQUEST);
    }

    const schedule = await workerService.getWorkerSchedule(id, startDate, endDate);
    R.success(res, schedule, undefined, req);
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
