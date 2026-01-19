"use client";

import { useEffect, useState, ReactNode, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth.store";
import { PageSkeleton } from "./skeletons";

interface AuthGuardProps {
  children: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

const DEFAULT_REDIRECT = "/auth/login";

export function AuthGuard({
  children,
  redirectTo = DEFAULT_REDIRECT,
  requireAuth = true,
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

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

