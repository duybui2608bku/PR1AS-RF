"use client";

import { Layout } from "antd";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";

const { Content } = Layout;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header />
      <Content
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--ant-color-bg-container)",
        }}
      >
        {children}
      </Content>
      <Footer />
    </Layout>
  );
}

