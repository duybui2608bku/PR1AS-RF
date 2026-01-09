"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth.store";
import {
  UserRole,
  AppRoute,
  buildWorkerProfileRoute,
} from "@/lib/constants/routes";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }
    const lastActiveRole = user.last_active_role;
    if (lastActiveRole === UserRole.WORKER) {
      const workerProfile = user.worker_profile;
      if (!workerProfile || workerProfile === null) {
        router.replace(AppRoute.WORKER_SETUP);
        return;
      }
      router.replace(buildWorkerProfileRoute(user.id));
    }
  }, [user, isAuthenticated, router]);

  if (user?.last_active_role === UserRole.WORKER) {
    return null;
  }

  return <>{children}</>;
}
