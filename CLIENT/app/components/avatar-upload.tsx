"use client";

import { useState, useRef, useEffect } from "react";
import { Avatar, Upload, Spin } from "antd";
import { CameraOutlined, UserOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { uploadImage } from "@/lib/utils/upload";
import { useTranslation } from "react-i18next";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import styles from "@/app/components/avatar-upload.module.scss";

interface AvatarUploadProps {
  value?: string | null;
  onChange?: (url: string | null) => void;
  size?: number;
  disabled?: boolean;
  className?: string;
}

export function AvatarUpload({
  value,
  onChange,
  size = 120,
  disabled = false,
  className,
}: AvatarUploadProps) {
  const { t } = useTranslation();
  const { handleError, handleSuccess } = useErrorHandler();
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(value || null);
  }, [value]);

  const handleFileChange = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      handleError(new Error(t("upload.avatar.invalidFormat")));
      return false;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      handleError(new Error(t("upload.avatar.tooLarge")));
      return false;
    }

    setLoading(true);

    try {
      const imageUrl = await uploadImage(file);

      setPreviewUrl(imageUrl);

      onChange?.(imageUrl);

      handleSuccess(t("upload.avatar.success"));
      return false;
    } catch (error) {
      handleError(error, t("upload.avatar.error"));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      handleFileChange(file);
      return false;
    },
    showUploadList: false,
    accept: "image/*",
    disabled: disabled || loading,
  };

  const handleClick = () => {
    if (!disabled && !loading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          position: "relative",
          cursor: disabled || loading ? "not-allowed" : "pointer",
          opacity: disabled || loading ? 0.6 : 1,
        }}
        onClick={handleClick}
      >
        <Spin spinning={loading}>
          <Avatar
            size={size}
            src={previewUrl || undefined}
            icon={!previewUrl ? <UserOutlined /> : undefined}
            style={{
              backgroundColor: !previewUrl
                ? "var(--ant-color-primary)"
                : undefined,
            }}
          />
        </Spin>
        {!disabled && !loading && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "var(--ant-color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid var(--ant-color-bg-container)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            <CameraOutlined style={{ color: "#fff", fontSize: 16 }} />
          </div>
        )}
      </div>

      <Upload {...uploadProps}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileChange(file);
            }
            e.target.value = "";
          }}
        />
      </Upload>

      {!disabled && (
        <span className={styles.hint}>
          {t("upload.avatar.changeHint")}
        </span>
      )}
    </div>
  );
}
