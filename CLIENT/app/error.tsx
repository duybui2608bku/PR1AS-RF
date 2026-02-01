"use client";

import { Result, Button } from "antd";
import { ReloadOutlined, HomeOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import styles from "./error.module.scss";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className={styles.wrapper}>
      <Result
        status="500"
        title={t("errorBoundary.title")}
        subTitle={t("errorBoundary.subtitle")}
        extra={[
          <Button
            key="retry"
            type="primary"
            icon={<ReloadOutlined />}
            onClick={reset}
          >
            {t("errorBoundary.retry")}
          </Button>,
          <Button
            key="home"
            icon={<HomeOutlined />}
            onClick={() => router.push("/")}
          >
            {t("errorBoundary.home")}
          </Button>,
        ]}
      />
      {process.env.NODE_ENV === "development" && (
        <div className={styles.devDetails}>
          <h4 className={styles.devTitle}>
            {t("errorBoundary.errorDetails")}
          </h4>
          <pre className={styles.devPre}>
            {error.message}
            {error.stack && `\n\n${error.stack}`}
            {error.digest && `\n\nDigest: ${error.digest}`}
          </pre>
        </div>
      )}
    </div>
  );
}
