"use client";

import { Layout, Skeleton } from "antd";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";

const { Content } = Layout;

enum SkeletonRows {
  HEADER = 1,
  TITLE = 1,
  CONTENT = 3,
  CARD = 2,
}

export function PageSkeleton(): JSX.Element {
  return (
    <Layout style={{ minHeight: "100vh", background: "var(--ant-color-bg-container)" }}>
      <Header />
      <Content style={{ padding: "24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Skeleton
            active
            paragraph={{ rows: SkeletonRows.TITLE }}
            style={{ marginBottom: 24 }}
          />
          <Skeleton
            active
            paragraph={{ rows: SkeletonRows.CONTENT }}
            style={{ marginBottom: 24 }}
          />
          <Skeleton
            active
            paragraph={{ rows: SkeletonRows.CARD }}
          />
        </div>
      </Content>
      <Footer />
    </Layout>
  );
}
