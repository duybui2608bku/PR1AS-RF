import { Request, Response } from "express";
import { workerService } from "../../services/worker/worker.service";
import { ResponseHelper } from "../../utils";
import { AppError } from "../../utils/AppError";
import { AUTH_MESSAGES } from "../../constants/messages";

export class WorkerController {
  async getWorkerById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const worker = await workerService.getWorkerById(id);
    if (!worker) {
      throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    }
    ResponseHelper.success(res, worker, undefined, req);
  }
}

export const workerController = new WorkerController();
