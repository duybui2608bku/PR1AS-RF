"use client";

import { Card, Typography, Rate, Avatar, Space } from "antd";
import { EnvironmentOutlined, UserOutlined, HeartOutlined } from "@ant-design/icons";
import Image from "next/image";
import { Service } from "../data/services.mock";
import { useMemo, useState } from "react";

const { Text, Title } = Typography;

interface ServiceCardProps {
  service: Service;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
}

export function ServiceCard({ service, size = "medium", onClick }: ServiceCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const cardStyles = useMemo(() => {
    const baseStyles: React.CSSProperties = {
      borderRadius: "12px",
      border: "1px solid #E5E5E5",
      overflow: "hidden",
      background: "#FFFFFF",
      cursor: "pointer",
      transition: "all 50ms ease-out",
      height: "100%",
      display: "flex",
      flexDirection: "column",
    };

    return baseStyles;
  }, []);

  const imageHeight = size === "large" ? 320 : size === "medium" ? 240 : 180;

  return (
    <Card
      hoverable
      style={cardStyles}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
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
            transition: "transform 100ms ease-out",
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
              borderRadius: "20px",
              fontSize: 12,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 4,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          >
            <span style={{ fontSize: 14 }}>❤️</span>
            Được khách yêu thích
          </div>
        )}

        {/* Heart Icon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
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
            transition: "all 50ms ease-out",
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
              fontSize: 18,
              color: isLiked ? "#FF385C" : "#1D1D1F",
              transition: "color 50ms ease-out",
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
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontWeight: 500,
            }}
          >
            {service.category}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            •
          </Text>
          <Space size={4}>
            <EnvironmentOutlined style={{ fontSize: 12, color: "#8C8C8C" }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {service.location}
            </Text>
          </Space>
        </Space>

        {/* Title */}
        <Title
          level={size === "large" ? 4 : 5}
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
            style={{ fontSize: 14 }}
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#1D1D1F",
            }}
          >
            {service.rating}
          </Text>
          <Text type="secondary" style={{ fontSize: 14 }}>
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
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {service.users[0].name}
                </Text>
              </>
            ) : (
              <Avatar.Group
                maxCount={2}
                size={24}
                maxStyle={{ color: "#1D1D1F", backgroundColor: "#F5F5F5" }}
              >
                {service.users.map((user) => (
                  <Avatar key={user.id} src={user.avatar} icon={<UserOutlined />} />
                ))}
              </Avatar.Group>
            )}
          </Space>
          <Text
            style={{
              fontSize: size === "large" ? 18 : 16,
              fontWeight: 700,
              color: "#711111",
            }}
          >
            {formatPrice(service.price)}
            <Text
              type="secondary"
              style={{
                fontSize: 12,
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
}

