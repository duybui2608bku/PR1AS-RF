"use client";

import { Card, Typography, Rate, Avatar, Space, Row, Col } from "antd";
import { EnvironmentOutlined, UserOutlined, HeartOutlined } from "@ant-design/icons";
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

const ServiceCardComponent = ({ service, size = "medium", onClick }: ServiceCardProps) => {
  const { t } = useTranslation();
  const [isLiked, setIsLiked] = useState(false);

  const formatPrice = useCallback((price: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);
  }, []);

  const formattedPrice = useMemo(() => formatPrice(service.price), [service.price, formatPrice]);

  const titleLevel = useMemo(() => size === "large" ? 4 : 5, [size]);
  const sizeClassName = useMemo(() => {
    if (size === "large") return styles.sizeLarge;
    if (size === "small") return styles.sizeSmall;
    return styles.sizeMedium;
  }, [size]);

  const handleLikeClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsLiked((prev) => !prev);
  }, []);

  return (
    <Card
      hoverable
      className={styles.card}
      onClick={onClick}
    >
      <div
        className={`${styles.imageWrapper} ${sizeClassName}`}
      >
        <Image
          src={service.image}
          alt={service.title}
          fill
          className={styles.image}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {service.loved && (
          <div className={styles.badge}>
            <span>❤️</span>
            {t("serviceCard.loved")}
          </div>
        )}

        <button
          type="button"
          onClick={handleLikeClick}
          className={styles.likeButton}
        >
          <HeartOutlined
            className={`${styles.heartIconSize} ${isLiked ? styles.lovedIcon : styles.heartIcon}`}
          />
        </button>
      </div>

      <div className={styles.contentBlock}>
        <Space className={styles.metaSpace} size="small">
          <Text type="secondary" className={styles.metaText}>
            {service.category}
          </Text>
          <Text type="secondary" className={styles.metaText}>
            •
          </Text>
          <Space size={4}>
            <EnvironmentOutlined className={styles.locationIcon} />
            <Text type="secondary" className={styles.metaText}>
              {service.location}
            </Text>
          </Space>
        </Space>

        <Title level={titleLevel} className={styles.title}>
          {service.title}
        </Title>

        <Space className={styles.ratingSpace} size={4}>
          <Rate
            disabled
            value={service.rating}
            allowHalf
            className={styles.ratingStars}
          />
          <Text className={styles.ratingText}>
            {service.rating}
          </Text>
          <Text type="secondary" className={styles.ratingCountText}>
            ({service.reviewCount})
          </Text>
        </Space>

        <Row className={styles.footerRow} justify="space-between" align="middle">
          <Col>
            <Space size={8}>
              {service.users.length === 1 ? (
                <>
                  <Avatar
                    size={24}
                    src={service.users[0].avatar}
                    icon={<UserOutlined />}
                  />
                  <Text type="secondary" className={styles.userNameText}>
                    {service.users[0].name}
                  </Text>
                </>
              ) : (
                <Avatar.Group
                  max={{ count: 2 }}
                  size={24}
                  className={styles.avatarGroup}
                >
                  {service.users.map((user) => (
                    <Avatar key={user.id} src={user.avatar} icon={<UserOutlined />} />
                  ))}
                </Avatar.Group>
              )}
            </Space>
          </Col>
          <Col>
            <Text className={`${styles.priceText} ${size === "large" ? styles.priceTextLarge : styles.priceTextDefault}`}>
              {formattedPrice}
              <Text type="secondary" className={styles.priceUnit}>
                /{service.priceUnit}
              </Text>
            </Text>
          </Col>
        </Row>
      </div>
    </Card>
  );
};

export const ServiceCard = memo(ServiceCardComponent);

