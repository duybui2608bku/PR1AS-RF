"use client";

import { useEffect, useSyncExternalStore, ReactNode, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth.store";
import type { User } from "@/lib/stores/auth.store";
import { authApi } from "@/lib/api/auth.api";
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

// Đồng bộ /auth/me một lần per session sau khi hydrate, để khôi phục state cũ
// (ví dụ user đã hoàn tất setup nhưng store còn snapshot trước khi cập nhật).
let hasSyncedSessionUser = false;

if (typeof window !== "undefined") {
  window.addEventListener("auth:logout", () => {
    hasSyncedSessionUser = false;
  });
}

export function AuthGuard({
  children,
  redirectTo = DEFAULT_REDIRECT,
  requireAuth = true,
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, setUser } = useAuthStore();
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

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || hasSyncedSessionUser) {
      return;
    }
    hasSyncedSessionUser = true;
    let cancelled = false;
    authApi
      .getMe()
      .then((latest) => {
        if (!cancelled && latest) {
          setUser(latest as unknown as User);
        }
      })
      .catch(() => {
        hasSyncedSessionUser = false;
      });
    return () => {
      cancelled = true;
    };
  }, [isHydrated, isAuthenticated, setUser]);

  if (!isHydrated || (requireAuth && !isAuthenticated)) {
    return <PageSkeleton />;
  }

  return <Fragment>{children}</Fragment>;
}

