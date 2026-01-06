"use client";

import { Card, Space, Avatar, Rate, Typography, Divider } from "antd";
import { useI18n } from "@/lib/hooks/use-i18n";
import styles from "../[id]/worker-detail.module.scss";

const { Text, Paragraph } = Typography;

interface Review {
  id: number;
  name: string;
  rating: number;
  comment: string;
  date: string;
  avatar: string | null;
}

interface WorkerReviewsProps {
  reviews?: Review[];
}

const DEFAULT_REVIEWS: Review[] = [
  {
    id: 1,
    name: "Nguyễn Văn A",
    rating: 5,
    comment: "Rất hài lòng với dịch vụ. Worker rất chuyên nghiệp và nhiệt tình!",
    date: "2 tuần trước",
    avatar: null,
  },
  {
    id: 2,
    name: "Trần Thị B",
    rating: 5,
    comment: "Tuyệt vời! Đúng như mong đợi. Sẽ quay lại sử dụng dịch vụ.",
    date: "1 tháng trước",
    avatar: null,
  },
  {
    id: 3,
    name: "Lê Văn C",
    rating: 4,
    comment: "Khá tốt, nhưng có thể cải thiện thêm một chút về thời gian phản hồi.",
    date: "2 tháng trước",
    avatar: null,
  },
];

export function WorkerReviews({ reviews = DEFAULT_REVIEWS }: WorkerReviewsProps) {
  const { t } = useI18n();

  return (
    <Card
      className={styles.reviewsCard}
      title={t("worker.detail.reviews.title") || "Đánh giá & Phản hồi"}
    >
      <div className={styles.reviewsList}>
        {reviews.map((review) => (
          <div key={review.id} className={styles.reviewItem}>
            <div className={styles.reviewHeader}>
              <Space>
                <Avatar>{review.name.charAt(0)}</Avatar>
                <div>
                  <Text strong>{review.name}</Text>
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
                      {review.date}
                    </Text>
                  </div>
                </div>
              </Space>
            </div>
            <Paragraph className={styles.reviewComment}>
              {review.comment}
            </Paragraph>
            {review.id < reviews.length && (
              <Divider style={{ margin: "12px 0" }} />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

