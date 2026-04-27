"use client";

import { Button, Input } from "antd";
import { SearchOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { memo, useCallback, useState } from "react";
import styles from "./hero.module.scss";

const HeroComponent = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) {
        router.push("/services");
        return;
      }
      router.push(`/services?q=${encodeURIComponent(trimmed)}`);
    },
    [query, router]
  );

  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>
            {t("home.hero.eyebrow", { defaultValue: "PR1AS marketplace" })}
          </span>
          <h1 className={styles.headline}>
            {t("home.hero.headline", {
              defaultValue: "Tìm người đồng hành cho mọi khoảnh khắc.",
            })}
          </h1>
          <p className={styles.lede}>
            {t("home.hero.lede", {
              defaultValue:
                "Trợ lý cá nhân, hướng dẫn viên, người đồng hành — được tuyển chọn và xác minh.",
            })}
          </p>

          <form className={styles.searchForm} onSubmit={handleSubmit}>
            <Input
              size="large"
              prefix={<SearchOutlined className={styles.searchIcon} />}
              placeholder={t("home.hero.searchPlaceholder", {
                defaultValue: "Bạn đang tìm dịch vụ gì?",
              })}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.searchInput}
            />
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              className={styles.searchSubmit}
            >
              {t("home.hero.searchSubmit", { defaultValue: "Khám phá" })}
            </Button>
          </form>

          <ul className={styles.proofRow}>
            <li>
              <strong>2,400+</strong>
              <span>
                {t("home.hero.proof.workers", {
                  defaultValue: "Đối tác đã xác minh",
                })}
              </span>
            </li>
            <li>
              <strong>4.9</strong>
              <span>
                {t("home.hero.proof.rating", {
                  defaultValue: "Điểm hài lòng trung bình",
                })}
              </span>
            </li>
            <li>
              <strong>24/7</strong>
              <span>
                {t("home.hero.proof.support", { defaultValue: "Hỗ trợ" })}
              </span>
            </li>
          </ul>
        </div>

        <div className={styles.visual} aria-hidden>
          <div className={styles.frameLarge} />
          <div className={styles.frameSmall} />
          <div className={styles.dot} />
        </div>
      </div>
    </section>
  );
};

export const Hero = memo(HeroComponent);
