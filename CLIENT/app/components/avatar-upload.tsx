"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, Upload, Spin, Typography } from "antd";
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

const { Text } = Typography;

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

  const handleFileChange = useCallback(async (file: File) => {
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
  }, [handleError, handleSuccess, onChange, t]);

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      handleFileChange(file);
      return false;
    },
    showUploadList: false,
    accept: "image/*",
    disabled: disabled || loading,
  };

  const handleClick = useCallback(() => {
    if (!disabled && !loading) {
      fileInputRef.current?.click();
    }
  }, [disabled, loading]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
    e.target.value = "";
  }, [handleFileChange]);

  const isDisabledState = disabled || loading;

  return (
    <div className={`${styles.wrapper} ${className || ""}`}>
      <div
        className={`${styles.avatarWrap} ${isDisabledState ? styles.disabled : ""}`}
        onClick={handleClick}
      >
        <Spin spinning={loading}>
          <Avatar
            size={size}
            src={previewUrl || undefined}
            icon={!previewUrl ? <UserOutlined /> : undefined}
            className={!previewUrl ? styles.placeholderAvatar : undefined}
          />
        </Spin>
        {!disabled && !loading ? (
          <div className={styles.badge}>
            <CameraOutlined className={styles.badgeIcon} />
          </div>
        ) : null}
      </div>

      <Upload {...uploadProps}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={handleInputChange}
        />
      </Upload>

      {!disabled ? (
        <Text className={styles.hint}>
          {t("upload.avatar.changeHint")}
        </Text>
      ) : null}
    </div>
  );
}
