"use client";

import { useEffect } from "react";
import { Result, Button } from "antd";
import { ReloadOutlined, HomeOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

/**
 * Global Error Handler cho Next.js
 * Xử lý các lỗi không được bắt bởi ErrorBoundary
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Global error:", error);
    }

    // Có thể gửi error đến error tracking service (Sentry, etc.)
    // logErrorToService(error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <Result
        status="500"
        title="500"
        subTitle="Xin lỗi, đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau."
        extra={[
          <Button
            key="retry"
            type="primary"
            icon={<ReloadOutlined />}
            onClick={reset}
          >
            Thử lại
          </Button>,
          <Button
            key="home"
            icon={<HomeOutlined />}
            onClick={() => router.push("/")}
          >
            Về trang chủ
          </Button>,
        ]}
      />
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            backgroundColor: "#fff2f0",
            border: "1px solid #ffccc7",
            borderRadius: "4px",
            maxWidth: "800px",
          }}
        >
          <h4 style={{ color: "#cf1322", marginBottom: "10px" }}>
            Chi tiết lỗi (Development only):
          </h4>
          <pre
            style={{
              color: "#cf1322",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message}
            {error.stack && `\n\n${error.stack}`}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        </div>
      )}
    </div>
  );
}

