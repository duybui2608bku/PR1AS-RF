"use client";

import { Card, Typography, Rate, Avatar, Space, Row, Col } from "antd";
import { EnvironmentOutlined, UserOutlined, HeartOutlined } from "@ant-design/icons";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useMemo, useState, memo, useCallback } from "react";
import { ImageHeight, FontSize } from "@/lib/constants/ui.constants";
import styles from "./service-card.module.scss";
import { Service } from "@/lib/api";

const { Text, Title } = Typography;

interface ServiceCardProps {
  service: Service;
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

  const imageHeight = useMemo(() => {
    return size === "large" ? ImageHeight.LARGE : size === "medium" ? ImageHeight.MEDIUM : ImageHeight.SMALL;
  }, [size]);

  const formattedPrice = useMemo(() => formatPrice(service.price), [service.price, formatPrice]);

  const titleLevel = useMemo(() => size === "large" ? 4 : 5, [size]);

  const priceFontSize = useMemo(() => size === "large" ? FontSize.LG : FontSize.MD, [size]);

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
        className={styles.imageWrapper}
        style={{ height: imageHeight }}
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
            className={isLiked ? styles.lovedIcon : styles.heartIcon}
            style={{ fontSize: FontSize.LG }}
          />
        </button>
      </div>

      <div className={styles.contentBlock}>
        <Space className={styles.metaSpace} size="small">
          <Text
            type="secondary"
            style={{
              fontSize: FontSize.XS,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontWeight: 500,
            }}
          >
            {service.category}
          </Text>
          <Text type="secondary" style={{ fontSize: FontSize.XS }}>
            •
          </Text>
          <Space size={4}>
            <EnvironmentOutlined style={{ fontSize: FontSize.XS, color: "var(--foreground-secondary)" }} />
            <Text type="secondary" style={{ fontSize: FontSize.XS }}>
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
            style={{ fontSize: FontSize.SM }}
          />
          <Text style={{ fontSize: FontSize.SM, fontWeight: 500, color: "var(--foreground)" }}>
            {service.rating}
          </Text>
          <Text type="secondary" style={{ fontSize: FontSize.SM }}>
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
                  <Text type="secondary" style={{ fontSize: FontSize.XS }}>
                    {service.users[0].name}
                  </Text>
                </>
              ) : (
                <Avatar.Group
                  max={{ count: 2, style: { color: "var(--foreground)", backgroundColor: "var(--background-secondary)" } }}
                  size={24}
                >
                  {service.users.map((user) => (
                    <Avatar key={user.id} src={user.avatar} icon={<UserOutlined />} />
                  ))}
                </Avatar.Group>
              )}
            </Space>
          </Col>
          <Col>
            <Text className={styles.priceText} style={{ fontSize: priceFontSize }}>
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

