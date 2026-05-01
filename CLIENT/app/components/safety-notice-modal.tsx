"use client";

import { Checkbox, Modal, Space, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import type { CheckboxChangeEvent } from "antd/es/checkbox";

const { Paragraph, Text, Title } = Typography;

const NOTICE_COOKIE_NAME = "pr1as_safety_notice_hidden";
const SIX_HOURS_IN_SECONDS = 6 * 60 * 60;

function hasHiddenNoticeCookie(): boolean {
  return document.cookie
    .split("; ")
    .some((cookie) => cookie.startsWith(`${NOTICE_COOKIE_NAME}=`));
}

function hideNoticeForSixHours(): void {
  document.cookie = `${NOTICE_COOKIE_NAME}=1; Max-Age=${SIX_HOURS_IN_SECONDS}; Path=/; SameSite=Lax`;
}

export function SafetyNoticeModal() {
  const [open, setOpen] = useState(false);
  const [hideForSixHours, setHideForSixHours] = useState(false);

  useEffect(() => {
    if (hasHiddenNoticeCookie()) {
      return;
    }

    queueMicrotask(() => {
      setOpen(true);
    });
  }, []);

  const handleClose = (): void => {
    if (hideForSixHours) {
      hideNoticeForSixHours();
    }

    setOpen(false);
  };

  const handleHideOptionChange = (event: CheckboxChangeEvent): void => {
    setHideForSixHours(event.target.checked);
  };

  return (
    <Modal
      title="Thông báo quan trọng"
      open={open}
      centered
      onOk={handleClose}
      onCancel={() => setOpen(false)}
      okText="Tôi đã hiểu"
      cancelText="Đóng"
      width={720}
    >
      <Space direction="vertical" size="middle">
        <Title level={5}>Lưu ý khi đặt lịch và giao dịch</Title>
        <Paragraph>
          Mọi giao dịch đặt lịch phải được thực hiện qua hệ thống để nhằm bảo
          vệ quyền lợi người dùng và ghi nhận lịch trình. Việc giao dịch ngoài
          hệ thống sẽ không được nền tảng hỗ trợ khi xảy ra tranh chấp.
        </Paragraph>
        <ul>
          <li>
            <Text strong>Tự bảo vệ an toàn:</Text> Vì đây là nền tảng kết nối
            làm việc trực tiếp, người dùng có trách nhiệm tự bảo vệ an toàn
            thân thể và tài sản cá nhân. Chúng tôi khuyến khích gặp gỡ tại nơi
            công cộng và thông báo cho người thân về lịch trình làm việc.
          </li>
          <li>
            <Text strong>Thỏa thuận công việc:</Text> Người thực hiện có quyền
            từ chối nếu công việc thực tế sai khác hoặc vượt quá mô tả ban đầu.
          </li>
          <li>
            <Text strong>Nghĩa vụ pháp lý:</Text> Người dùng tự chịu trách
            nhiệm kê khai thu nhập cá nhân và đóng thuế theo quy định của Nhà
            nước. Nền tảng không chịu trách nhiệm thay cho các nghĩa vụ thuế cá
            nhân này.
          </li>
        </ul>
        <Checkbox checked={hideForSixHours} onChange={handleHideOptionChange}>
          Không hiển thị lại thông báo này trong 6 tiếng
        </Checkbox>
      </Space>
    </Modal>
  );
}
