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

const { Content, Footer } = Layout;
import { UserOutlined, LockOutlined, PhoneOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStandardizedMutation } from "@/lib/hooks/use-standardized-mutation";
import { useAuthStore } from "@/lib/stores/auth.store";
import {
  userProfileApi,
  type UpdateBasicProfileInput,
} from "@/lib/api/user.api";
import { AvatarUpload } from "@/app/components/avatar-upload";
import { AuthGuard } from "@/lib/components/auth-guard";
import { AppRoute } from "@/lib/constants/routes";
import styles from "@/app/client/profile/edit/page.module.scss";

const { Title, Text } = Typography;

function EditProfileContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, setUser } = useAuthStore();
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [avatarOverride, setAvatarOverride] = useState<string | null>();

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: userProfileApi.getProfile,
    retry: false,
  });

  const avatarUrl = avatarOverride ?? profile?.avatar ?? user?.avatar ?? null;

  const updateProfileMutation = useStandardizedMutation(
    (data: UpdateBasicProfileInput) =>
      userProfileApi.updateBasicProfile(data),
    {
      onSuccess: (updatedUser) => {
        if (user) {
          const currentPhone =
            typeof user.phone === "string" ? user.phone : undefined;
          setUser({
            ...user,
            avatar: updatedUser.avatar || user.avatar,
            name: updatedUser.full_name || user.name,
            phone: updatedUser.phone || currentPhone,
          });
        }

        queryClient.invalidateQueries({ queryKey: ["user-profile"] });
        message.success(t("profile.edit.success"));
        router.push(AppRoute.CLIENT_PROFILE);
      },
    }
  );

  useEffect(() => {
    if (profile) {
      form.setFieldsValue({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
      });
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
    } catch (_error) {
      message.error(t("profile.edit.error"));
    }
  };

  const handleAvatarChange = (url: string | null) => {
    setAvatarOverride(url);
  };

  return (
    <Layout className={styles.layout}>
      <Content className={styles.content}>
        <div className={styles.container}>
          <Space className={styles.headerSpace}>
            <Title level={2} className={styles.title}>
              {t("profile.edit.title")}
            </Title>
          </Space>

          <Card loading={isLoadingProfile}>
            <Row gutter={[32, 32]}>
              <Col xs={24} sm={24} md={8} lg={7} xl={6}>
                <div className={styles.avatarBlock}>
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
