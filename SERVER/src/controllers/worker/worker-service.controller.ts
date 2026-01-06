import mongoose from "mongoose";
import { Response } from "express";
import { AuthRequest } from "../../middleware/auth";
import { workerServiceService } from "../../services/worker/worker-service.service";
import { AppError, R, validateWithSchema } from "../../utils";
import { COMMON_MESSAGES, VALIDATION_MESSAGES } from "../../constants/messages";
import {
  createWorkerServicesSchema,
  updateWorkerServiceSchema,
} from "../../validations/worker/worker-service.validation";

class WorkerServiceController {
  private getAuthenticatedWorkerId(req: AuthRequest): string {
    const workerId = req.user?.sub;

    if (!workerId) {
      throw AppError.unauthorized();
    }

    return workerId;
  }

  async createWorkerServices(req: AuthRequest, res: Response): Promise<void> {
    const body = validateWithSchema(createWorkerServicesSchema, req.body);
    const workerId = this.getAuthenticatedWorkerId(req);

    const services = await workerServiceService.createWorkerServices({
      workerId,
      services: body.services,
    });

    R.created(res, { services }, COMMON_MESSAGES.CREATED);
  }

  async updateWorkerService(req: AuthRequest, res: Response): Promise<void> {
    const body = validateWithSchema(updateWorkerServiceSchema, req.body);
    const workerId = this.getAuthenticatedWorkerId(req);
    const { serviceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      throw AppError.badRequest(COMMON_MESSAGES.BAD_REQUEST, [
        {
          field: "serviceId",
          message: VALIDATION_MESSAGES.INVALID("serviceId"),
        },
      ]);
    }

    const service = await workerServiceService.updateWorkerService({
      workerId,
      serviceId,
      body,
    });

    R.success(res, { service }, COMMON_MESSAGES.UPDATED);
  }

  async deleteWorkerService(req: AuthRequest, res: Response): Promise<void> {
    const workerId = this.getAuthenticatedWorkerId(req);
    const { serviceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      throw AppError.badRequest(COMMON_MESSAGES.BAD_REQUEST, [
        {
          field: "serviceId",
          message: VALIDATION_MESSAGES.INVALID("serviceId"),
        },
      ]);
    }

    await workerServiceService.deleteWorkerService({
      workerId,
      serviceId,
    });

    R.noContent(res);
  }

  async getWorkerServices(req: AuthRequest, res: Response): Promise<void> {
    const workerId = this.getAuthenticatedWorkerId(req);
    const services = await workerServiceService.getWorkerServices(workerId);
    R.success(res, { services }, COMMON_MESSAGES.SUCCESS);
  }
}

export const workerServiceController = new WorkerServiceController();
