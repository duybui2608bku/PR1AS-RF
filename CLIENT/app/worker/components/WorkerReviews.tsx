"use client";

import { Card, Space, Avatar, Rate, Typography, Divider } from "antd";
import { useI18n } from "@/lib/hooks/use-i18n";
import type { WorkerReviewItem } from "@/lib/api/worker.api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import "dayjs/locale/en";
import "dayjs/locale/ko";
import "dayjs/locale/zh-cn";
import { useEffect } from "react";
import styles from "../[id]/worker-detail.module.scss";

dayjs.extend(relativeTime);

const { Text, Paragraph } = Typography;

interface WorkerReviewsProps {
  reviews?: WorkerReviewItem[];
}

function formatReviewDate(dateString: string): string {
  const date = dayjs(dateString);
  return date.fromNow();
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function WorkerReviews({ reviews = [] }: WorkerReviewsProps) {
  const { t, locale } = useI18n();

  useEffect(() => {
    const dayjsLocaleMap: Record<string, string> = {
      vi: "vi",
      en: "en",
      ko: "ko",
      zh: "zh-cn",
    };
    const dayjsLocale = dayjsLocaleMap[locale] || "en";
    dayjs.locale(dayjsLocale);
  }, [locale]);

  if (reviews.length === 0) {
    return (
      <Card
        className={styles.reviewsCard}
        title={t("worker.detail.reviews.title") || "Đánh giá & Phản hồi"}
      >
        <Text type="secondary">
          {t("worker.detail.reviews.noReviews") || "Chưa có đánh giá nào"}
        </Text>
      </Card>
    );
  }

  return (
    <Card
      className={styles.reviewsCard}
      title={t("worker.detail.reviews.title") || "Đánh giá & Phản hồi"}
    >
      <div className={styles.reviewsList}>
        {reviews.map((review, index) => (
          <div key={review.id} className={styles.reviewItem}>
            <div className={styles.reviewHeader}>
              <Space>
                <Avatar src={review.client.avatar}>
                  {getInitials(review.client.full_name)}
                </Avatar>
                <div>
                  <Text strong>
                    {review.client.full_name || t("worker.detail.reviews.anonymous") || "Ẩn danh"}
                  </Text>
                  <div>
                    <Rate
                      disabled
                      value={review.rating}
                      style={{ fontSize: 12 }}
                    />
                    <Text
                      type="secondary"
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                      }}
                    >
                      {formatReviewDate(review.created_at)}
                    </Text>
                  </div>
                </div>
              </Space>
            </div>
            <Paragraph className={styles.reviewComment}>
              {review.comment}
            </Paragraph>
            {review.worker_reply && (
              <div className={styles.workerReply}>
                <Text strong type="secondary" style={{ fontSize: 12 }}>
                  {t("worker.detail.reviews.workerReply") || "Phản hồi từ worker:"}
                </Text>
                <Paragraph className={styles.replyText} style={{ marginTop: 4 }}>
                  {review.worker_reply}
                </Paragraph>
              </div>
            )}
            {index < reviews.length - 1 && (
              <Divider style={{ margin: "12px 0" }} />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

