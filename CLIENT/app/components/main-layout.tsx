"use client";

import { usePathname } from "next/navigation";
import { Layout } from "antd";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import styles from "./main-layout.module.scss";

const { Content } = Layout;

/**
 * Layout chung cho toàn app: Header + Content + Footer.
 * Chỉ khai báo 1 lần tại đây. Các route /admin/* không dùng (admin có layout riêng).
 */
export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <Layout className={styles.layout}>
      <Header />
      <Content className={styles.content}>{children}</Content>
      <Footer />
    </Layout>
  );
}
