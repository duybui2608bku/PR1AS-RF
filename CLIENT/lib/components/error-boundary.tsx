"use client";

import React, { Component, type ReactNode } from "react";
import { Result, Button } from "antd";
import { ReloadOutlined, HomeOutlined } from "@ant-design/icons";
import { getTranslationSync } from "../utils/i18n-helper";
import { useRouter } from "next/navigation";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo) {
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const title = getTranslationSync("errorBoundary.title");
      const subtitle = getTranslationSync("errorBoundary.subtitle");
      const retryText = getTranslationSync("errorBoundary.retry");
      const homeText = getTranslationSync("errorBoundary.home");
      const errorDetailsText = getTranslationSync("errorBoundary.errorDetails");

      return (
        <ErrorBoundaryContent
          title={title}
          subtitle={subtitle}
          retryText={retryText}
          homeText={homeText}
          errorDetailsText={errorDetailsText}
          error={this.state.error}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorBoundaryContentProps {
  title: string;
  subtitle: string;
  retryText: string;
  homeText: string;
  errorDetailsText: string;
  error: Error | null;
  onReset: () => void;
}

function ErrorBoundaryContent({
  title,
  subtitle,
  retryText,
  homeText,
  errorDetailsText,
  error,
  onReset,
}: ErrorBoundaryContentProps) {
  const router = useRouter();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <Result
        status="500"
        title={title}
        subTitle={subtitle}
        extra={[
          <Button
            key="retry"
            type="primary"
            icon={<ReloadOutlined />}
            onClick={onReset}
          >
            {retryText}
          </Button>,
          <Button
            key="home"
            icon={<HomeOutlined />}
            onClick={() => router.push("/")}
          >
            {homeText}
          </Button>,
        ]}
      />
      {process.env.NODE_ENV !== "production" && error && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            backgroundColor: "#fff2f0",
            border: "1px solid #ffccc7",
            borderRadius: "4px",
            maxWidth: "800px",
          }}
        >
          <h4 style={{ color: "#cf1322", marginBottom: "10px" }}>
            {errorDetailsText}
          </h4>
          <pre
            style={{
              color: "#cf1322",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.toString()}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </div>
      )}
    </div>
  );
}

