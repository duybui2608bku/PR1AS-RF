"use client";

import { Modal, Space, Input, Select } from "antd";
import type { TFunction } from "i18next";
import { WorkerActionType, CancellationReason } from "@/app/worker/bookings/constants/booking.constants";
import { Fragment } from "react";

const { TextArea } = Input;
const { Option } = Select;

enum TextAreaRows {
  DEFAULT = 4,
}

interface WorkerBookingActionModalProps {
  open: boolean;
  action: WorkerActionType | null;
  workerResponse: string;
  onWorkerResponseChange: (workerResponse: string) => void;
  cancelReason: CancellationReason | undefined;
  onCancelReasonChange: (reason: CancellationReason | undefined) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLoading: boolean;
  t: TFunction;
}

const getModalTitle = (action: WorkerActionType | null, t: TFunction): string => {
  if (action === WorkerActionType.REJECT) {
    return t("booking.worker.actions.rejectTitle");
  }
  if (action === WorkerActionType.CANCEL) {
    return t("booking.worker.actions.cancelTitle");
  }
  return "";
};

const getModalMessage = (action: WorkerActionType | null, t: TFunction): string => {
  if (action === WorkerActionType.REJECT) {
    return t("booking.worker.actions.rejectMessage");
  }
  if (action === WorkerActionType.CANCEL) {
    return t("booking.worker.actions.cancelMessage");
  }
  return "";
};



export function WorkerBookingActionModal({
  open,
  action,
  workerResponse,
  onWorkerResponseChange,
  cancelReason,
  onCancelReasonChange,
  onConfirm,
  onCancel,
  confirmLoading,
  t,
}: WorkerBookingActionModalProps): React.ReactElement {
  const isCancelAction = action === WorkerActionType.CANCEL;

  return (
    <Modal
      open={open}
      title={getModalTitle(action, t)}
      onOk={onConfirm}
      centered
      onCancel={onCancel}
      okText={t("common.confirm")}
      cancelText={t("common.cancel")}
      confirmLoading={confirmLoading}
    >
      <Space orientation="vertical" style={{ width: "100%" }}>
        <span>{getModalMessage(action, t)}</span>
        {isCancelAction ? (
          <Fragment>
            <Select
              placeholder={t("booking.cancel.selectReason")}
              value={cancelReason}
              onChange={onCancelReasonChange}
              style={{ width: "100%" }}
            >
              <Option value={CancellationReason.CLIENT_REQUEST}>
                {t("booking.cancel.reasons.clientRequest")}
              </Option>
              <Option value={CancellationReason.WORKER_UNAVAILABLE}>
                {t("booking.cancel.reasons.workerUnavailable")}
              </Option>
              <Option value={CancellationReason.SCHEDULE_CONFLICT}>
                {t("booking.cancel.reasons.scheduleConflict")}
              </Option>
              <Option value={CancellationReason.EMERGENCY}>
                {t("booking.cancel.reasons.emergency")}
              </Option>
              <Option value={CancellationReason.PAYMENT_FAILED}>
                {t("booking.cancel.reasons.paymentFailed")}
              </Option>
              <Option value={CancellationReason.POLICY_VIOLATION}>
                {t("booking.cancel.reasons.policyViolation")}
              </Option>
              <Option value={CancellationReason.OTHER}>
                {t("booking.cancel.reasons.other")}
              </Option>
            </Select>
            <TextArea
              rows={TextAreaRows.DEFAULT}
              placeholder={t("booking.cancel.notesPlaceholder")}
              value={workerResponse}
              onChange={(event) => onWorkerResponseChange(event.target.value)}
            />
          </Fragment>
        ) : (
          <TextArea
            rows={TextAreaRows.DEFAULT}
            placeholder={t("booking.worker.actions.responsePlaceholder")}
            value={workerResponse}
            onChange={(event) => onWorkerResponseChange(event.target.value)}
          />
        )}
      </Space>
    </Modal>
  );
}

