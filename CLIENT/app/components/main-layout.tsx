"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect, Fragment } from "react";
import { Layout } from "antd";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import { HeaderScrollSentinel } from "@/app/components/header-scroll-sentinel";
import { AppRoute } from "@/lib/constants/routes";
import styles from "./main-layout.module.scss";

const { Content } = Layout;

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isChatPage = pathname?.startsWith("/chat");
  const isHomePage = pathname === AppRoute.HOME;
  const showFooter = pathname === "/";

  const [headerCompact, setHeaderCompact] = useState(false);

  useEffect(() => {
    if (!isHomePage) {
      setHeaderCompact(true);
    }
  }, [pathname, isHomePage]);

  if (isAdmin) {
    return <Fragment>{children}</Fragment>;
  }

  return (
    <Layout className={styles.layout}>
      <Header
        showCategoryTabs={!isChatPage}
        compact={isHomePage ? headerCompact : true}
      />
      <Content className={styles.content}>
        <HeaderScrollSentinel
          enabled={isHomePage}
          pathname={pathname ?? ""}
          onCompactChange={setHeaderCompact}
        />
        {children}
      </Content>
      {!isChatPage && <Footer />}
    </Layout>
  );
}

