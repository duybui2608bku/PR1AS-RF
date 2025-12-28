"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Spin } from "antd";
import { useAuthStore } from "@/lib/stores/auth.store";

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
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--ant-color-bg-container)",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
}

