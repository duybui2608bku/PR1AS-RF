import { IUserDocument, IUserPublic } from "../types/auth/user.types";
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
    worker_profile: user.worker_profile,
    client_profile: user.client_profile,
    created_at: user.created_at,
    coords: user.coords,
  };
};

export const extractUserIdFromRequest = (req: AuthRequest): string => {
  if (!req.user?.sub) {
    throw AppError.unauthorized(AUTH_MESSAGES.LOGIN_REQUIRED);
  }
  return req.user.sub;
};
