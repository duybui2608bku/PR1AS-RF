"use client";

import { useState } from "react";
import { Layout } from "antd";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/lib/components/auth-guard";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import { DepositModal } from "@/lib/components/deposit-modal";
import { AppRoute } from "@/lib/constants/routes";
import styles from "@/app/client/wallet/deposit/page.module.scss";

const { Content } = Layout;

function DepositContent() {
  const router = useRouter();
  const [depositModalOpen, setDepositModalOpen] = useState<boolean>(true);

  const handleClose = (): void => {
    setDepositModalOpen(false);
    router.push(AppRoute.CLIENT_WALLET);
  };

  return (
    <Layout className={styles.layout}>
      <Header />
      <Content />
      <Footer />
      <DepositModal open={depositModalOpen} onClose={handleClose} />
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
