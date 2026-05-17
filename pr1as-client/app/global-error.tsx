"use client"

import * as React from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error("[global-error]", error)
  }, [error])

  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          backgroundColor: "#fafafa",
          color: "#0a0a0a",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 500,
              color: "#dc2626",
            }}
          >
            Đã xảy ra lỗi nghiêm trọng
          </p>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, lineHeight: 1.2 }}>
            Ứng dụng không thể tiếp tục
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#525252" }}>
            Có lỗi không mong muốn xảy ra. Vui lòng thử lại hoặc quay về trang
            chủ. Nếu lỗi vẫn tiếp diễn, hãy liên hệ hỗ trợ.
          </p>
          {error.digest ? (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#737373",
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              }}
            >
              Mã lỗi: {error.digest}
            </p>
          ) : null}
          <div
            style={{
              marginTop: 8,
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                cursor: "pointer",
                border: "none",
                borderRadius: 8,
                padding: "0.5rem 1rem",
                fontSize: 14,
                fontWeight: 500,
                backgroundColor: "#171717",
                color: "#fafafa",
              }}
            >
              Thử lại
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              style={{
                cursor: "pointer",
                borderRadius: 8,
                padding: "0.5rem 1rem",
                fontSize: 14,
                fontWeight: 500,
                backgroundColor: "transparent",
                color: "#171717",
                border: "1px solid #e5e5e5",
              }}
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
