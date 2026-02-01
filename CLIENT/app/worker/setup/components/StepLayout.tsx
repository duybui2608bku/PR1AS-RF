"use client";

import React from "react";
import { Layout, Typography, Row, Col } from "antd";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import styles from "./StepLayout.module.scss";

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
}) => (
  <Layout className={styles.layout}>
    <Header />
    <Content className={styles.content}>
      <div className={styles.wrapper}>
        <Row justify="center">
          <Col span={24}>
            <div className={styles.stepHeader}>
              <Title level={1} className={styles.stepTitle}>
                {stepTitle}
              </Title>
              {stepDescription && (
                <Paragraph type="secondary" className={styles.stepDescription}>
                  {stepDescription}
                </Paragraph>
              )}
            </div>
          </Col>
        </Row>
        {children}
      </div>
    </Content>
    <Footer />
  </Layout>
);

