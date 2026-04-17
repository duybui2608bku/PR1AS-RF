import { Input, Modal } from "antd";
import type { TFunction } from "i18next";

interface WorkerMessageModalProps {
  open: boolean;
  content: string;
  isSubmitting: boolean;
  onChangeContent: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  t: TFunction;
}

export function WorkerMessageModal({
  open,
  content,
  isSubmitting,
  onChangeContent,
  onCancel,
  onSubmit,
  t,
}: WorkerMessageModalProps) {
  return (
    <Modal
      open={open}
      title={t("worker.detail.message")}
      onCancel={onCancel}
      onOk={onSubmit}
      confirmLoading={isSubmitting}
      okText={t("common.submit")}
      cancelText={t("common.cancel")}
    >
      <Input.TextArea
        value={content}
        onChange={(event) => onChangeContent(event.target.value)}
        autoSize={{ minRows: 3, maxRows: 6 }}
      />
    </Modal>
  );
}
