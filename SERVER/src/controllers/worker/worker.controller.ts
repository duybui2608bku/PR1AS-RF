import { Request, Response } from "express";
import { workerService } from "../../services/worker/worker.service";
import { R } from "../../utils";
import { COMMON_MESSAGES, WORKER_MESSAGES } from "../../constants/messages";
import { validateWithSchema } from "../../utils/validator";
import { workerGroupedByServiceQuerySchema } from "../../validations/worker/worker-grouped-query.validation";
import { locationSuggestionsQuerySchema } from "../../validations/worker/location-suggestion.validation";
import { locationService } from "../../services/location/location.service";

export class WorkerController {
  async getWorkerById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const worker = await workerService.getWorkerById(id);
    R.success(res, worker, undefined, req);
  }

  async getWorkersGroupedByService(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(
      workerGroupedByServiceQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await workerService.getWorkersGroupedByService(query);
    R.success(res, result, WORKER_MESSAGES.WORKERS_GROUPED_BY_SERVICE_FETCHED, req);
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
    R.success(res, suggestions, WORKER_MESSAGES.LOCATION_SUGGESTIONS_FETCHED, req);
  }
}

export const workerController = new WorkerController();
