"use client";

import React from "react";
import { Typography, Row, Col } from "antd";
import styles from "./StepLayout.module.scss";

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
);

