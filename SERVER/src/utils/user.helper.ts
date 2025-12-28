import { IUserDocument, IUserPublic } from "../types/auth/user.types";

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
