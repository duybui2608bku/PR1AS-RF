import { IUserDocument, IUserPublic } from "../types/auth/user.types";
import { PricingPlanCode } from "../constants/pricing";
import { AuthRequest } from "../middleware/auth";
import { AppError } from "./AppError";
import { AUTH_MESSAGES } from "../constants/messages";

export const toPublicUser = (user: IUserDocument): IUserPublic => {
  return {
    id: user._id.toString(),
    email: user.email,
    avatar: user.avatar,
    full_name: user.full_name,
    phone: user.phone,
    roles: user.roles,
    status: user.status,
    last_active_role: user.last_active_role,
    verify_email: user.verify_email,
    created_by_admin: user.created_by_admin ?? false,
    worker_profile: user.worker_profile,
    client_profile: user.client_profile,
    created_at: user.created_at,
    last_login: user.last_login,
    coords: user.coords,
    meta_data: {
      reputation_score: user.meta_data?.reputation_score ?? 100,
      pricing_plan_code:
        user.meta_data?.pricing_plan_code ?? PricingPlanCode.STANDARD,
      pricing_started_at: user.meta_data?.pricing_started_at ?? null,
      pricing_expires_at: user.meta_data?.pricing_expires_at ?? null,
      onboarding_done: user.meta_data?.onboarding_done ?? false,
    },
  };
};

export const extractUserIdFromRequest = (req: AuthRequest): string => {
  if (!req.user?.sub) {
    throw AppError.unauthorized(AUTH_MESSAGES.LOGIN_REQUIRED);
  }
  return req.user.sub;
};
