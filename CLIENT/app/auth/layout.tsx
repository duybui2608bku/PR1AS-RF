"use client";

import { Layout } from "antd";
import styles from "./layout.module.scss";

const { Content } = Layout;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Content className={styles.content}>{children}</Content>;
}
