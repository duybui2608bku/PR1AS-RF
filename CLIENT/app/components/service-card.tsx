"use client";

import { Card, Typography, Rate, Avatar, Space } from "antd";
import { EnvironmentOutlined, UserOutlined, HeartOutlined } from "@ant-design/icons";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { Service } from "../data/services.mock";
import { useMemo, useState, memo, useCallback } from "react";
import { ImageHeight, FontSize, BorderRadius, TransitionDuration } from "@/lib/constants/ui.constants";

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

  const cardStyles = useMemo(() => {
    const baseStyles: React.CSSProperties = {
      borderRadius: `${BorderRadius.LARGE}px`,
      border: "1px solid #E5E5E5",
      overflow: "hidden",
      background: "#FFFFFF",
      cursor: "pointer",
      transition: `all ${TransitionDuration.FAST}ms ease-out`,
      height: "100%",
      display: "flex",
      flexDirection: "column",
    };

    return baseStyles;
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

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "translateY(-2px)";
    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "translateY(0)";
    e.currentTarget.style.boxShadow = "none";
  }, []);

  return (
    <Card
      hoverable
      style={cardStyles}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      styles={{
        body: {
          padding: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Image */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: imageHeight,
          overflow: "hidden",
          backgroundColor: "#F5F5F5",
        }}
      >
        <Image
          src={service.image}
          alt={service.title}
          fill
          style={{
            objectFit: "cover",
            transition: `transform ${TransitionDuration.NORMAL}ms ease-out`,
          }}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Loved Badge */}
        {service.loved && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "rgba(255, 255, 255, 0.95)",
              color: "#1D1D1F",
              padding: "6px 12px",
              borderRadius: `${BorderRadius.EXTRA_LARGE}px`,
              fontSize: FontSize.XS,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 4,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
            >
            <span style={{ fontSize: 14 }}>❤️</span>
            {t("serviceCard.loved")}
          </div>
        )}

        {/* Heart Icon */}
        <button
          onClick={handleLikeClick}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "none",
            background: "rgba(255, 255, 255, 0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: `all ${TransitionDuration.FAST}ms ease-out`,
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.background = "#FFFFFF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.95)";
          }}
        >
          <HeartOutlined
            style={{
              fontSize: FontSize.LG,
              color: isLiked ? "#FF385C" : "#1D1D1F",
              transition: `color ${TransitionDuration.FAST}ms ease-out`,
            }}
          />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Category & Location */}
        <Space style={{ marginBottom: 8 }} size="small">
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
            <EnvironmentOutlined style={{ fontSize: FontSize.XS, color: "#8C8C8C" }} />
            <Text type="secondary" style={{ fontSize: FontSize.XS }}>
              {service.location}
            </Text>
          </Space>
        </Space>

        {/* Title */}
        <Title
          level={titleLevel}
          style={{
            margin: 0,
            marginBottom: 8,
            fontWeight: 700,
            color: "#711111",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {service.title}
        </Title>

        {/* Rating & Reviews */}
        <Space style={{ marginBottom: 12 }} size={4}>
          <Rate
            disabled
            value={service.rating}
            allowHalf
            style={{ fontSize: FontSize.SM }}
          />
          <Text
            style={{
              fontSize: FontSize.SM,
              fontWeight: 500,
              color: "#1D1D1F",
            }}
          >
            {service.rating}
          </Text>
          <Text type="secondary" style={{ fontSize: FontSize.SM }}>
            ({service.reviewCount})
          </Text>
        </Space>

        {/* Users & Price */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 12,
            borderTop: "1px solid #F5F5F5",
          }}
        >
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
                max={{ count: 2, style: { color: "#1D1D1F", backgroundColor: "#F5F5F5" } }}
                size={24}
              >
                {service.users.map((user) => (
                  <Avatar key={user.id} src={user.avatar} icon={<UserOutlined />} />
                ))}
              </Avatar.Group>
            )}
          </Space>
          <Text
            style={{
              fontSize: priceFontSize,
              fontWeight: 700,
              color: "#711111",
            }}
          >
            {formattedPrice}
            <Text
              type="secondary"
              style={{
                fontSize: FontSize.XS,
                fontWeight: 400,
                marginLeft: 4,
              }}
            >
              /{service.priceUnit}
            </Text>
          </Text>
        </div>
      </div>
    </Card>
  );
};

export const ServiceCard = memo(ServiceCardComponent);

