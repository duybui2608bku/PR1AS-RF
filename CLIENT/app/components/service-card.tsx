"use client";

import { Card, Typography, Rate, Avatar, Space, Row, Col } from "antd";
import {
  EnvironmentOutlined,
  UserOutlined,
  HeartOutlined,
  HeartFilled,
} from "@ant-design/icons";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useMemo, useState, memo, useCallback } from "react";
import styles from "./service-card.module.scss";
import { ServiceListing } from "@/lib/types/service-listing";

const { Text, Title } = Typography;

interface ServiceCardProps {
  service: ServiceListing;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
}

const ServiceCardComponent = ({
  service,
  size = "medium",
  onClick,
}: ServiceCardProps) => {
  const { t } = useTranslation();
  const [isLiked, setIsLiked] = useState(false);

  const formatPrice = useCallback((price: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);
  }, []);

  const formattedPrice = useMemo(
    () => formatPrice(service.price),
    [service.price, formatPrice]
  );

  const titleLevel = useMemo(() => (size === "large" ? 4 : 5), [size]);
  const sizeClassName = useMemo(() => {
    if (size === "large") return styles.sizeLarge;
    if (size === "small") return styles.sizeSmall;
    return styles.sizeMedium;
  }, [size]);

  const handleLikeClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setIsLiked((prev) => !prev);
    },
    []
  );

  return (
    <Card hoverable className={styles.card} onClick={onClick}>
      <div className={`${styles.imageWrapper} ${sizeClassName}`}>
        <Image
          src={service.image}
          alt={service.title}
          fill
          className={styles.image}
          sizes="(max-width: 768px) 80vw, (max-width: 1200px) 33vw, 25vw"
        />

        {service.loved && (
          <div className={styles.badge}>
            <span aria-hidden>★</span>
            {t("serviceCard.loved")}
          </div>
        )}

        <span className={styles.eyebrow}>{service.category}</span>

        <button
          type="button"
          onClick={handleLikeClick}
          className={styles.likeButton}
          aria-label={isLiked ? "Bỏ yêu thích" : "Yêu thích"}
        >
          {isLiked ? (
            <HeartFilled
              className={`${styles.heartIconSize} ${styles.lovedIcon}`}
            />
          ) : (
            <HeartOutlined
              className={`${styles.heartIconSize} ${styles.heartIcon}`}
            />
          )}
        </button>
      </div>

      <div className={styles.contentBlock}>
        <Title level={titleLevel} className={styles.title}>
          {service.title}
        </Title>

        <span className={styles.locationPill}>
          <EnvironmentOutlined />
          {service.location}
        </span>

        <Space className={styles.ratingSpace} size={6}>
          <Rate
            disabled
            value={service.rating}
            allowHalf
            className={styles.ratingStars}
          />
          <Text className={styles.ratingText}>{service.rating.toFixed(1)}</Text>
          <Text className={styles.ratingCountText}>
            ({service.reviewCount})
          </Text>
        </Space>

        <Row
          className={styles.footerRow}
          justify="space-between"
          align="middle"
          wrap={false}
        >
          <Col flex="auto" style={{ minWidth: 0 }}>
            <Space size={8} style={{ minWidth: 0 }}>
              {service.users.length === 1 ? (
                <>
                  <Avatar
                    size={28}
                    src={service.users[0].avatar}
                    icon={<UserOutlined />}
                  />
                  <Text className={styles.userNameText}>
                    {service.users[0].name}
                  </Text>
                </>
              ) : (
                <Avatar.Group
                  max={{ count: 3 }}
                  size={28}
                  className={styles.avatarGroup}
                >
                  {service.users.map((user) => (
                    <Avatar
                      key={user.id}
                      src={user.avatar}
                      icon={<UserOutlined />}
                    />
                  ))}
                </Avatar.Group>
              )}
            </Space>
          </Col>
          <Col flex="none">
            <Text
              className={`${styles.priceText} ${
                size === "large"
                  ? styles.priceTextLarge
                  : styles.priceTextDefault
              }`}
            >
              {formattedPrice}
              <Text className={styles.priceUnit}>/{service.priceUnit}</Text>
            </Text>
          </Col>
        </Row>
      </div>
    </Card>
  );
};

export const ServiceCard = memo(ServiceCardComponent);
