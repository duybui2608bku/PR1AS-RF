"use client";

import { Result, Button } from "antd";
import { useRouter } from "next/navigation";
import { HomeOutlined } from "@ant-design/icons";

/**
 * Trang 404 - Không tìm thấy trang
 */
export default function NotFound() {
  const router = useRouter();

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
        status="404"
        title="404"
        subTitle="Xin lỗi, trang bạn đang tìm kiếm không tồn tại."
        extra={
          <Button
            type="primary"
            icon={<HomeOutlined />}
            onClick={() => router.push("/")}
          >
            Về trang chủ
          </Button>
        }
      />
    </div>
  );
}

