"use client";

import { useEffect, useSyncExternalStore, ReactNode, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth.store";
import { PageSkeleton } from "./skeletons";

interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

const DEFAULT_REDIRECT = "/auth/login";
const subscribeHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

export function AuthGuard({
  children,
  redirectTo = DEFAULT_REDIRECT,
  requireAuth = true,
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const isHydrated = useSyncExternalStore(
    subscribeHydration,
    getHydratedSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    if (isHydrated && requireAuth && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isHydrated, isAuthenticated, requireAuth, redirectTo, router]);

  if (!isHydrated || (requireAuth && !isAuthenticated)) {
    return <PageSkeleton />;
  }

  return <Fragment>{children}</Fragment>;
}

