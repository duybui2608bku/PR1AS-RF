"use client";

import { usePathname } from "next/navigation";
import { Layout } from "antd";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import styles from "./main-layout.module.scss";
import { Fragment } from "react";

const { Content } = Layout;

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isChatPage = pathname?.startsWith("/chat");
  const showFooter = pathname === "/";

  if (isAdmin) {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <Layout className={styles.layout}>
      <Header showCategoryTabs={!isChatPage} />
      <Content className={styles.content}>{children}</Content>
      {!isChatPage && <Footer />}
    </Layout>
  );
}

