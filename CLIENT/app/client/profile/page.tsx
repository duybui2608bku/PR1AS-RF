"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  Typography,
  Space,
  Row,
  Col,
  Button,
  Avatar,
  Tag,
  Divider,
  Descriptions,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { userProfileApi } from "@/lib/api/user.api";
import { AuthGuard } from "@/lib/components/auth-guard";
import { AppRoute } from "@/lib/constants/routes";
import { Spacing } from "@/lib/constants/ui.constants";
import styles from "./profile.module.scss";

const { Title, Text } = Typography;

function ProfileContent() {
  const router = useRouter();
  const { t } = useTranslation();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: userProfileApi.getProfile,
    retry: false,
  });

  const handleEdit = () => {
    router.push(AppRoute.CLIENT_PROFILE_EDIT);
  };

  return (
    <div className={styles.container}>
          <Row justify="space-between" align="middle" className={styles.headerRow}>
            <Col>
              <Title level={2} className={styles.pageTitle}>
                {t("profile.title")}
              </Title>
            </Col>
          </Row>

          <Card loading={isLoading}>
            <Row gutter={[Spacing.XXL, Spacing.XXL]}>
              <Col xs={24} sm={24} md={8} lg={7} xl={6}>
                <div className={styles.avatarBlock}>
                  <Avatar
                    size={160}
                    src={profile?.avatar || undefined}
                    icon={!profile?.avatar ? <UserOutlined /> : undefined}
                    className={`${styles.avatar} ${!profile?.avatar ? styles.avatarPlaceholder : ""}`}
                  />
                  <Title level={4} className={styles.avatarTitle}>
                    {profile?.full_name || profile?.email || "User"}
                  </Title>
                  {profile?.roles && profile.roles.length > 0 && (
                    <Space className={styles.rolesSpace} wrap>
                      {profile.roles.map((role) => (
                        <Tag key={role} color="blue">
                          {role}
                        </Tag>
                      ))}
                    </Space>
                  )}
                </div>
              </Col>

              <Col xs={24} sm={24} md={16} lg={17} xl={18}>
                <Descriptions
                  title={t("profile.info.title")}
                  bordered
                  column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
                  size="middle"
                >
                  <Descriptions.Item
                    label={
                      <Space>
                        <UserOutlined />
                        <Text>{t("profile.info.fullName")}</Text>
                      </Space>
                    }
                  >
                    {profile?.full_name || (
                      <Text type="secondary">{t("profile.info.notSet")}</Text>
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item
                    label={
                      <Space>
                        <MailOutlined />
                        <Text>{t("profile.info.email")}</Text>
                      </Space>
                    }
                  >
                    <Space wrap>
                      {profile?.email}
                      {profile?.verify_email ? (
                        <Tag icon={<CheckCircleOutlined />} color="success">
                          {t("profile.info.verified")}
                        </Tag>
                      ) : (
                        <Tag icon={<CloseCircleOutlined />} color="warning">
                          {t("profile.info.unverified")}
                        </Tag>
                      )}
                    </Space>
                  </Descriptions.Item>

                  <Descriptions.Item
                    label={
                      <Space>
                        <PhoneOutlined />
                        <Text>{t("profile.info.phone")}</Text>
                      </Space>
                    }
                  >
                    {profile?.phone || (
                      <Text type="secondary">{t("profile.info.notSet")}</Text>
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label={t("profile.info.status")}>
                    {profile?.status ? (
                      <Tag
                        color={
                          profile.status === "active" ? "success" : "default"
                        }
                      >
                        {profile.status}
                      </Tag>
                    ) : (
                      <Text type="secondary">{t("profile.info.notSet")}</Text>
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label={t("profile.info.lastActiveRole")}>
                    {profile?.last_active_role ? (
                      <Tag color="purple">{profile.last_active_role}</Tag>
                    ) : (
                      <Text type="secondary">{t("profile.info.notSet")}</Text>
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label={t("profile.info.userId")}>
                    <Text code className={styles.userIdText}>
                      {profile?.id}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>

                <Divider />

                <Space>
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={handleEdit}
                    size="large"
                  >
                    {t("profile.editProfile")}
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
