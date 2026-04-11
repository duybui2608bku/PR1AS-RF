"use client";

import { usePathname } from "next/navigation";
import { useState, useCallback, Fragment } from "react";
import { Layout } from "antd";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import { HeaderScrollSentinel } from "@/app/components/header-scroll-sentinel";
import styles from "./main-layout.module.scss";

const { Content } = Layout;

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isChatPage = pathname?.startsWith("/chat");
  const showFooter = pathname === "/";

  const [headerCompact, setHeaderCompact] = useState(false);
  const handleHeaderCompact = useCallback((compact: boolean) => {
    setHeaderCompact(compact);
  }, []);

  if (isAdmin) {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <Layout className={styles.layout}>
      <Header
        showCategoryTabs={!isChatPage}
        compact={headerCompact}
      />
      <Content className={styles.content}>
        <HeaderScrollSentinel onCompactChange={handleHeaderCompact} />
        {children}
      </Content>
      {!isChatPage && <Footer />}
    </Layout>
  );
}

