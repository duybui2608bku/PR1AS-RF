"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  Typography,
  Space,
  Row,
  Col,
  Button,
  InputNumber,
  Form,
  message,
  Spin,
  Divider,
  Layout,
} from "antd";
import { WalletOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { walletApi } from "@/lib/api/wallet.api";
import { AuthGuard } from "@/lib/components/auth-guard";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import { AppRoute } from "@/lib/constants/routes";
import { WALLET_LIMITS, DEPOSIT_AMOUNT_PRESETS } from "@/lib/constants/wallet";
import { useCurrencyStore } from "@/lib/stores/currency.store";

const { Title, Text } = Typography;
const { Content } = Layout;

interface DepositFormValues {
  amount: number;
}

function DepositContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const [form] = Form.useForm<DepositFormValues>();

  const { data: balance, isLoading: isLoadingBalance } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: walletApi.getBalance,
    retry: false,
  });

  const createDepositMutation = useMutation({
    mutationFn: walletApi.createDeposit,
    onSuccess: (data) => {
      message.success(t("wallet.deposit.success"));
      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    },
    onError: () => {
      message.error(t("wallet.deposit.error"));
    },
  });

  const handleSubmit = async (values: DepositFormValues): Promise<void> => {
    await createDepositMutation.mutateAsync({ amount: values.amount });
  };

  const handlePresetClick = (amount: number): void => {
    form.setFieldsValue({ amount });
  };

  const handleBack = (): void => {
    router.back();
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
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Space
            style={{
              marginBottom: 24,
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBack}
                type="text"
              >
                {t("common.back")}
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                {t("wallet.deposit.title")}
              </Title>
            </Space>
          </Space>

          <Row gutter={[24, 24]}>
            <Col xs={24} sm={24} md={8}>
              <Card>
                <Space
                  direction="vertical"
                  size="large"
                  style={{ width: "100%" }}
                >
                  <div>
                    <Text type="secondary">{t("wallet.balance")}</Text>
                    <div style={{ marginTop: 8 }}>
                      {isLoadingBalance ? (
                        <Spin size="small" />
                      ) : (
                        <Title
                          level={3}
                          style={{
                            margin: 0,
                            color: "var(--ant-color-primary)",
                          }}
                        >
                          {formatCurrency(balance?.balance || 0)}
                        </Title>
                      )}
                    </div>
                  </div>
                  <Divider />
                  <div>
                    <Text type="secondary">{t("wallet.deposit.subtitle")}</Text>
                  </div>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={24} md={16}>
              <Card>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  autoComplete="off"
                >
                  <Form.Item
                    name="amount"
                    label={t("wallet.deposit.amount.label")}
                    rules={[
                      {
                        required: true,
                        message: t("wallet.deposit.amount.required"),
                      },
                      {
                        type: "number",
                        min: WALLET_LIMITS.MIN_DEPOSIT_AMOUNT,
                        message: t("wallet.deposit.amount.min", {
                          amount: formatCurrency(
                            WALLET_LIMITS.MIN_DEPOSIT_AMOUNT
                          ),
                        }),
                      },
                      {
                        type: "number",
                        max: WALLET_LIMITS.MAX_DEPOSIT_AMOUNT,
                        message: t("wallet.deposit.amount.max", {
                          amount: formatCurrency(
                            WALLET_LIMITS.MAX_DEPOSIT_AMOUNT
                          ),
                        }),
                      },
                    ]}
                  >
                    <InputNumber<number>
                      style={{ width: "100%" }}
                      placeholder={t("wallet.deposit.amount.placeholder")}
                      min={WALLET_LIMITS.MIN_DEPOSIT_AMOUNT}
                      max={WALLET_LIMITS.MAX_DEPOSIT_AMOUNT}
                      formatter={(value) =>
                        value
                          ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          : ""
                      }
                      parser={(value) => {
                        if (!value) return WALLET_LIMITS.MIN_DEPOSIT_AMOUNT;
                        const parsed = value.replace(/\$\s?|(,*)/g, "");
                        const num = Number.parseInt(parsed, 10);
                        if (Number.isNaN(num))
                          return WALLET_LIMITS.MIN_DEPOSIT_AMOUNT;
                        return num;
                      }}
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item>
                    <Text type="secondary">{t("wallet.deposit.presets")}</Text>
                    <div style={{ marginTop: 12 }}>
                      <Space wrap>
                        {DEPOSIT_AMOUNT_PRESETS.map((preset) => (
                          <Button
                            key={preset}
                            onClick={() => handlePresetClick(preset)}
                            type="default"
                          >
                            {formatCurrency(preset)}
                          </Button>
                        ))}
                      </Space>
                    </div>
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<WalletOutlined />}
                      size="large"
                      block
                      loading={createDepositMutation.isPending}
                    >
                      {createDepositMutation.isPending
                        ? t("wallet.deposit.processing")
                        : t("wallet.deposit.submit")}
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>
      <Footer />
    </Layout>
  );
}

export default function DepositPage() {
  return (
    <AuthGuard>
      <DepositContent />
    </AuthGuard>
  );
}
