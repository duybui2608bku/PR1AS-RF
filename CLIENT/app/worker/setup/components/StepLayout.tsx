"use client";

import React from "react";
import { Layout, Typography } from "antd";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";

const { Content } = Layout;
const { Title, Paragraph } = Typography;

interface StepLayoutProps {
  children: React.ReactNode;
  stepTitle: string;
  stepDescription?: string;
}

export const StepLayout: React.FC<StepLayoutProps> = ({
  children,
  stepTitle,
  stepDescription,
}) => {
  return (
    <Layout style={{ minHeight: "100vh", background: "var(--ant-color-bg-container)" }}>
      <Header />

      <Content
        style={{
          background: "var(--ant-color-bg-container)",
          maxWidth: "100%",
          overflowX: "hidden",
          padding: 0,
        }}
      >
        {/* Step Content */}
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "48px 24px",
            minHeight: "calc(100vh - 200px)",
          }}
        >
          {/* Step Header */}
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <Title level={1} style={{ marginBottom: 8, fontSize: 32 }}>
              {stepTitle}
            </Title>
            {stepDescription && (
              <Paragraph
                type="secondary"
                style={{ fontSize: 18, marginBottom: 0 }}
              >
                {stepDescription}
              </Paragraph>
            )}
          </div>

          {/* Step Content */}
          {children}
        </div>
      </Content>

      <Footer />
    </Layout>
  );
};

