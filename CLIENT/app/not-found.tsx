"use client";

import { Result, Button } from "antd";
import { useRouter } from "next/navigation";
import { HomeOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import styles from "./not-found.module.scss";

export default function NotFound() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className={styles.wrapper}>
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
