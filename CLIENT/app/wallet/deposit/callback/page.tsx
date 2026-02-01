"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Layout, Spin, Result, Button } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { walletApi } from "@/lib/api/wallet.api";
import { AuthGuard } from "@/lib/components/auth-guard";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import { AppRoute } from "@/lib/constants/routes";
import styles from "@/app/wallet/deposit/callback/page.module.scss";

const { Content } = Layout;

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const hasCalledRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const transactionKey = params.vnp_TxnRef || "";

    const processedKey = `processed_${transactionKey}`;
    if (transactionKey && sessionStorage.getItem(processedKey)) {
      setStatus("success");
      return;
    }

    if (hasCalledRef.current) {
      return;
    }

    const verifyPayment = async () => {
      hasCalledRef.current = true;

      try {
        if (!params.vnp_ResponseCode && !params.vnp_TxnRef) {
          setStatus("error");
          setErrorMessage(
            t("wallet.deposit.callback.invalidParameters", {
              defaultValue: "Invalid callback parameters",
            })
          );
          return;
        }

        const timeoutPromise = new Promise((_, reject) => {
          timeoutRef.current = setTimeout(() => {
            reject(new Error("Request timeout after 5 seconds"));
          }, 5000);
        });

        await Promise.race([
          walletApi.verifyDepositCallback(params),
          timeoutPromise,
        ]);

        if (transactionKey) {
          sessionStorage.setItem(processedKey, "true");
        }

        setStatus("success");
      } catch (error: any) {
        if (error?.response?.status === 404) {
          if (params.vnp_ResponseCode === "00") {
            if (transactionKey) {
              sessionStorage.setItem(processedKey, "true");
            }
            setStatus("success");
            return;
          }
        }

        setStatus("error");
        const message =
          error?.response?.data?.error?.message ||
          error?.response?.data?.message ||
          error?.message ||
          t("wallet.deposit.callback.error", {
            defaultValue: "Payment verification failed",
          });
        setErrorMessage(message);
      }
    };

    verifyPayment();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchParams, t]);

  const handleBackToDeposit = () => {
    router.push(AppRoute.CLIENT_WALLET_DEPOSIT);
  };

  return (
    <Layout className={styles.layout}>
      <Header />
      <Content className={styles.content}>
        <div className={styles.container}>
          {status === "loading" && (
            <Result
              icon={<Spin size="large" />}
              title={t("wallet.deposit.callback.verifying", {
                defaultValue: "Verifying payment...",
              })}
              subTitle={t("wallet.deposit.callback.pleaseWait", {
                defaultValue: "Please wait while we verify your payment",
              })}
            />
          )}

          {status === "success" && (
            <Result
              icon={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
              title={t("wallet.deposit.callback.success", {
                defaultValue: "Payment Successful",
              })}
              subTitle={t("wallet.deposit.callback.successMessage", {
                defaultValue:
                  "Your deposit has been successfully processed and added to your wallet",
              })}
              extra={[
                <Button type="primary" key="back" onClick={handleBackToDeposit}>
                  {t("wallet.deposit.callback.backToDeposit", {
                    defaultValue: "Back to Deposit",
                  })}
                </Button>,
              ]}
            />
          )}

          {status === "error" && (
            <Result
              icon={<CloseCircleOutlined className={styles.iconError} />}
              title={t("wallet.deposit.callback.failed", {
                defaultValue: "Payment Verification Failed",
              })}
              subTitle={errorMessage}
              extra={[
                <Button type="primary" key="back" onClick={handleBackToDeposit}>
                  {t("wallet.deposit.callback.backToDeposit", {
                    defaultValue: "Back to Deposit",
                  })}
                </Button>,
              ]}
            />
          )}
        </div>
      </Content>
      <Footer />
    </Layout>
  );
}

export default function WalletDepositCallbackPage() {
  return (
    <AuthGuard>
      <CallbackContent />
    </AuthGuard>
  );
}
