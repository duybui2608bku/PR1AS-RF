"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  message,
  Space,
  Row,
  Col,
  Divider,
  Layout,
} from "antd";
import { UserOutlined, LockOutlined, PhoneOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth.store";
import {
  userProfileApi,
  type UpdateBasicProfileInput,
} from "@/lib/api/user.api";
import { AvatarUpload } from "@/app/components/avatar-upload";
import { AuthGuard } from "@/lib/components/auth-guard";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import { AppRoute } from "@/lib/constants/routes";
import styles from "@/app/client/profile/edit/page.module.scss";

const { Title, Text } = Typography;
const { Content } = Layout;

function EditProfileContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    user?.avatar || null
  );

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: userProfileApi.getProfile,
    retry: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateBasicProfileInput) =>
      userProfileApi.updateBasicProfile(data),
    onSuccess: (updatedUser) => {
      if (user) {
        setUser({
          ...user,
          avatar: updatedUser.avatar || user.avatar,
          name: updatedUser.full_name || user.name,
          phone: updatedUser.phone || (user as any).phone,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      message.success(t("profile.edit.success"));
      router.push(AppRoute.CLIENT_PROFILE);
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.message ||
        t("profile.edit.error");
      message.error(errorMessage);
    },
  });

  useEffect(() => {
    if (profile) {
      form.setFieldsValue({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
      });
      setAvatarUrl(profile.avatar || null);
    }
  }, [profile, form]);

  const handleSubmit = async (values: {
    full_name?: string;
    phone?: string;
    password?: string;
    old_password?: string;
  }) => {
    try {
      const updateData: UpdateBasicProfileInput = {};

      if (values.full_name !== undefined) {
        updateData.full_name = values.full_name || null;
      }
      if (values.phone !== undefined) {
        updateData.phone = values.phone || null;
      }
      if (values.password) {
        updateData.password = values.password;
        updateData.old_password = values.old_password;
      }
      if (avatarUrl !== null) {
        updateData.avatar = avatarUrl;
      }

      const hasChanges =
        updateData.full_name !== undefined ||
        updateData.phone !== undefined ||
        updateData.password !== undefined ||
        updateData.avatar !== undefined;

      if (!hasChanges) {
        message.warning(t("profile.edit.warning"));
        return;
      }

      await updateProfileMutation.mutateAsync(updateData);
    } catch (error) {
      message.error(t("profile.edit.error"));
    }
  };

  const handleAvatarChange = (url: string | null) => {
    setAvatarUrl(url);
  };

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background: "var(--ant-color-bg-container)",
      }}
    >
      <Header />
      <Content style={{ padding: "24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Space style={{ marginBottom: 24 }}>
            <Title level={2} style={{ margin: 0 }}>
              {t("profile.edit.title")}
            </Title>
          </Space>

          <Card loading={isLoadingProfile}>
            <Row gutter={[32, 32]}>
              <Col xs={24} sm={24} md={8} lg={7} xl={6}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "24px",

                    borderRadius: 8,
                    height: "100%",
                  }}
                >
                  <AvatarUpload
                    value={avatarUrl}
                    onChange={handleAvatarChange}
                    size={160}
                    disabled={updateProfileMutation.isPending}
                  />
                </div>
              </Col>

              <Col xs={24} sm={24} md={16} lg={17} xl={18}>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  autoComplete="off"
                  size="large"
                >
                  <Form.Item
                    name="full_name"
                    label={t("profile.edit.fullName.label")}
                    rules={[
                      {
                        max: 100,
                        message: t("profile.edit.fullName.maxLength"),
                      },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder={t("profile.edit.fullName.placeholder")}
                      allowClear
                    />
                  </Form.Item>

                  <Form.Item
                    name="phone"
                    label={t("profile.edit.phone.label")}
                    rules={[
                      {
                        pattern: /^[0-9+\-\s()]+$/,
                        message: t("profile.edit.phone.invalidFormat"),
                      },
                      {
                        max: 20,
                        message: t("profile.edit.phone.maxLength"),
                      },
                    ]}
                  >
                    <Input
                      prefix={<PhoneOutlined />}
                      placeholder={t("profile.edit.phone.placeholder")}
                      allowClear
                    />
                  </Form.Item>

                  <Divider plain>
                    <Text type="secondary" className={styles.dividerText}>
                      {t("profile.edit.changePassword.title")}
                    </Text>
                  </Divider>

                  <Form.Item
                    name="old_password"
                    label={t("profile.edit.oldPassword.label")}
                    dependencies={["password"]}
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          const newPassword = getFieldValue("password");
                          if (newPassword && !value) {
                            return Promise.reject(
                              new Error(t("profile.edit.oldPassword.required"))
                            );
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder={t("profile.edit.oldPassword.placeholder")}
                      allowClear
                      autoComplete="new-password"
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    label={t("profile.edit.newPassword.label")}
                    rules={[
                      {
                        min: 8,
                        message: t("profile.edit.newPassword.minLength"),
                      },
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      placeholder={t("profile.edit.newPassword.placeholder")}
                      allowClear
                      autoComplete="new-password"
                    />
                  </Form.Item>

                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={updateProfileMutation.isPending}
                      >
                        {t("profile.edit.update")}
                      </Button>
                      <Button
                        onClick={() => router.push(AppRoute.CLIENT_PROFILE)}
                      >
                        {t("profile.edit.cancel")}
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Col>
            </Row>
          </Card>
        </div>
      </Content>
      <Footer />
    </Layout>
  );
}

export default function EditProfilePage() {
  return (
    <AuthGuard>
      <EditProfileContent />
    </AuthGuard>
  );
}
