"use client";

import { Card, Row, Col, Statistic, Typography, Space } from "antd";
import {
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import { useI18n } from "@/lib/hooks/use-i18n";

const { Title } = Typography;

export default function DashboardPage() {
  const { t } = useI18n();

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Title level={2}>{t("dashboard.welcome")}</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.stats.totalUsers")}
              value={1128}
              prefix={<UserOutlined />}
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.stats.totalOrders")}
              value={93}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: "#1890ff" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.stats.revenue")}
              value={112893}
              prefix={<DollarOutlined />}
              suffix="VND"
              valueStyle={{ color: "#cf1322" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t("dashboard.stats.growth")}
              value={9.3}
              prefix={<RiseOutlined />}
              suffix="%"
              valueStyle={{ color: "#3f8600" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={t("dashboard.recentActivity")}>
            <p>{t("dashboard.noRecentActivity")}</p>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={t("dashboard.quickActions")}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <p>{t("dashboard.quickActionsDesc")}</p>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}

