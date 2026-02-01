"use client";

import { Layout } from "antd";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import styles from "./layout.module.scss";

const { Content } = Layout;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout className={styles.layout}>
      <Header />
      <Content className={styles.content}>
        {children}
      </Content>
      <Footer />
    </Layout>
  );
}

