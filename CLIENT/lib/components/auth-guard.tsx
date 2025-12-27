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

/**
 * AuthGuard Component
 * Bảo vệ routes, tự động redirect nếu chưa đăng nhập
 * Tái sử dụng cho tất cả protected pages
 */
export function AuthGuard({
  children,
  redirectTo = "/auth/login",
  requireAuth = true,
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Đợi zustand persist hydrate xong từ localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Redirect nếu chưa đăng nhập (sau khi đã hydrate)
  useEffect(() => {
    if (isHydrated && requireAuth && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isHydrated, isAuthenticated, requireAuth, redirectTo, router]);

  // Hiển thị loading khi chưa hydrate hoặc đang check auth
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

