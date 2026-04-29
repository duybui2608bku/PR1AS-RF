"use client";

import { Footer } from "@/app/components/footer";
import { Header } from "@/app/components/header";
import { SafetyNoticeModal } from "@/app/components/safety-notice-modal";
import { Layout } from "antd";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import styles from "./main-layout.module.scss";

const { Content } = Layout;

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isChatPage = pathname?.startsWith("/chat");

  if (isAdmin) {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <Layout className={styles.layout}>
      <Header />
      <Content className={styles.content}>{children}</Content>
      {!isChatPage && <Footer />}
      <SafetyNoticeModal />
    </Layout>
  );
}
