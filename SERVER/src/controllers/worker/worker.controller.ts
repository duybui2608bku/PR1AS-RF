import { Request, Response } from "express";
import { workerService } from "../../services/worker/worker.service";
import { R } from "../../utils";
import { AppError } from "../../utils/AppError";
import { AUTH_MESSAGES, WORKER_MESSAGES } from "../../constants/messages";

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
    const result = await workerService.getWorkersGroupedByService();
    R.success(
      res,
      result,
      WORKER_MESSAGES.WORKERS_GROUPED_BY_SERVICE_FETCHED,
      req
    );
  }
}

export const workerController = new WorkerController();
