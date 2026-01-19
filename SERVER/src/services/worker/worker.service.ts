import { userRepository } from "../../repositories/auth/user.repository";

import { AppError } from "../../utils/AppError";

import { AUTH_MESSAGES } from "../../constants/messages";

import { IUserDocument } from "../../types/auth/user.types";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";

export interface WorkerDetailResponse {
  user: {
    id: string;
    full_name: string | null;
    avatar: string | null;
    email: string;
  };
  worker_profile: IUserDocument["worker_profile"] | null;
  services?: Array<{
    _id: string;
    service_id: string;
    service_code: string;
    pricing: Array<{
      unit: string;
      duration: number;
      price: number;
      currency: string;
    }>;
    is_active: boolean;
  }>;
}

export class WorkerService {
  async getWorkerById(workerId: string): Promise<WorkerDetailResponse> {
    const user = await userRepository.findById(workerId);

    if (!user) {
      throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    }
    if (!user.worker_profile) {
      throw AppError.notFound(AUTH_MESSAGES.WORKER_PROFILE_NOT_FOUND);
    }

    const workerProfile = {
      ...user.worker_profile,
      coords: user.coords
        ? {
            latitude: user.coords.latitude,
            longitude: user.coords.longitude,
          }
        : undefined,
    };

    // Get worker services
    const workerServices = await workerServiceRepository.findAllForWorker(
      user._id.toString()
    );

    const services = workerServices.map((ws) => ({
      _id: ws._id.toString(),
      service_id: ws.service_id.toString(),
      service_code: ws.service_code,
      pricing: ws.pricing.map((p) => ({
        unit: p.unit,
        duration: p.duration,
        price: p.price,
        currency: p.currency,
      })),
      is_active: ws.is_active,
    }));

    return {
      user: {
        id: user._id.toString(),
        full_name: user.full_name || null,
        avatar: user.avatar || null,
        email: user.email,
      },
      worker_profile: workerProfile,
      services,
    };
  }

  async getWorkersGroupedByService(): Promise<
    Array<{
      service: {
        id: string;
        code: string;
        name: {
          en: string;
          vi: string;
          zh?: string | null;
          ko?: string | null;
        };
        description: {
          en: string;
          vi: string;
          zh?: string | null;
          ko?: string | null;
        };
        category: string;
      };
      workers: Array<{
        id: string;
        full_name: string | null;
        avatar: string | null;
        worker_profile: {
          title: string | null;
          introduction: string | null;
          gallery_urls: string[];
        } | null;
        pricing: Array<{
          unit: string;
          duration: number;
          price: number;
          currency: string;
        }>;
      }>;
    }>
  > {
    return workerServiceRepository.findWorkersGroupedByService();
  }
}

export const workerService = new WorkerService();
