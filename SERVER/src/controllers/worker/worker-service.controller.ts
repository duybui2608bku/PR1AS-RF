import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { workerServiceService } from "../../services/worker/worker-service.service";
import { AppError, R, validateWithSchema } from "../../utils";
import { COMMON_MESSAGES } from "../../constants/messages";
import {
  createWorkerServicesSchema,
  updateWorkerServiceSchema,
} from "../../validations/worker/worker-service.validation";

class WorkerServiceController {
  private getWorkerId(req: AuthRequest): string {
    const workerId = req.user?.sub;
    if (!workerId) throw AppError.unauthorized();
    return workerId;
  }

  async createWorkerServices(req: AuthRequest, res: Response): Promise<void> {
    const body = validateWithSchema(createWorkerServicesSchema, req.body);
    const services = await workerServiceService.createWorkerServices({
      workerId: this.getWorkerId(req),
      services: body.services,
    });
    R.created(res, { services }, COMMON_MESSAGES.CREATED, req);
  }

  async updateWorkerService(req: AuthRequest, res: Response): Promise<void> {
    const body = validateWithSchema(updateWorkerServiceSchema, req.body);
    const service = await workerServiceService.updateWorkerService({
      workerId: this.getWorkerId(req),
      serviceId: req.params.serviceId,
      body,
    });
    R.success(res, { service }, COMMON_MESSAGES.UPDATED, req);
  }

  async deleteWorkerService(req: AuthRequest, res: Response): Promise<void> {
    await workerServiceService.deleteWorkerService({
      workerId: this.getWorkerId(req),
      serviceId: req.params.serviceId,
    });
    R.noContent(res);
  }

  async getWorkerServices(req: AuthRequest, res: Response): Promise<void> {
    const services = await workerServiceService.getWorkerServices(this.getWorkerId(req));
    R.success(res, { services }, COMMON_MESSAGES.SUCCESS, req);
  }
}

export const workerServiceController = new WorkerServiceController();
