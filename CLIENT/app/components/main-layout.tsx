"use client";

import { usePathname } from "next/navigation";
import { Layout } from "antd";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import { CategoryTabs } from "@/app/components/category-tabs";
import styles from "./main-layout.module.scss";
import { Fragment, Suspense } from "react";

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
      <Header />
      {!isChatPage && (
        <Suspense fallback={null}>
          <CategoryTabs />
        </Suspense>
      )}
      <Content className={styles.content}>{children}</Content>
      {!isChatPage && <Footer />}
    </Layout>
  );
}

