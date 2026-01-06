import { User } from "@/lib/stores/auth.store";
import { UserRole, AppRoute, buildWorkerProfileRoute } from "@/lib/constants/routes";

export const getProfileRoute = (user: User | null): string => {
  if (!user) {
    return AppRoute.AUTH_LOGIN;
  }

  const lastActiveRole = user.last_active_role;

  if (lastActiveRole === UserRole.WORKER) {
    const workerProfile = user.worker_profile;
    if (!workerProfile || workerProfile === null) {
      return AppRoute.WORKER_SETUP;
    }
    return buildWorkerProfileRoute(user.id);
  }

  return AppRoute.CLIENT_PROFILE;
};

