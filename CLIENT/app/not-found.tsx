"use client";

import { Result, Button } from "antd";
import { useRouter } from "next/navigation";
import { HomeOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const router = useRouter();
  const { t } = useTranslation();

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
        subTitle={t("notFound.subtitle")}
        extra={
          <Button
            type="primary"
            icon={<HomeOutlined />}
            onClick={() => router.push("/")}
          >
            {t("notFound.home")}
          </Button>
        }
      />
    </div>
  );
}
