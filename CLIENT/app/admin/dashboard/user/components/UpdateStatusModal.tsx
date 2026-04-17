import { Modal, Space, Typography } from "antd";
import type { TFunction } from "i18next";
import type { User } from "@/lib/api/user.api";
import type { UserStatus } from "../constants/user.constants";
import styles from "../page.module.scss";

interface UpdateStatusModalProps {
  open: boolean;
  selectedUser: User | null;
  newStatus: UserStatus | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  t: TFunction;
}

export function UpdateStatusModal({
  open,
  selectedUser,
  newStatus,
  isSubmitting,
  onConfirm,
  onCancel,
  t,
}: UpdateStatusModalProps) {
  return (
    <Modal
      title={t("admin.user.updateStatus.title")}
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={isSubmitting}
      okText={t("common.confirm")}
      cancelText={t("common.cancel")}
      centered
    >
      {selectedUser && newStatus && (
        <Space direction="vertical" size="middle" className={styles.modalSpace}>
          <Typography.Text>
            {t("admin.user.updateStatus.message", {
              email: selectedUser.email,
              currentStatus: t(`admin.user.status.${selectedUser.status}`),
              newStatus: t(`admin.user.status.${newStatus}`),
            })}
          </Typography.Text>
        </Space>
      )}
    </Modal>
  );
}
