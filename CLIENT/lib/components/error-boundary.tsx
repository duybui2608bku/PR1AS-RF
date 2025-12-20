"use client";

import React, { Component, type ReactNode } from "react";
import { Result, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component - Bắt lỗi React errors
 */
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Có thể gửi error đến error tracking service (Sentry, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Nếu có custom fallback, sử dụng nó
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI mặc định
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            padding: "20px",
          }}
        >
          <Result
            status="500"
            title="500"
            subTitle="Xin lỗi, đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau."
            extra={
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={this.handleReset}
              >
                Thử lại
              </Button>
            }
          />
          {process.env.NODE_ENV === "development" && this.state.error && (
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
                Chi tiết lỗi (Development only):
              </h4>
              <pre
                style={{
                  color: "#cf1322",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {this.state.error.toString()}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

