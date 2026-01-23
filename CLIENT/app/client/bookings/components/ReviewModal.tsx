"use client";

import {
  Modal,
  Form,
  Input,
  Rate,
  Space,
  Typography,
  Row,
  Col,
  Card,
} from "antd";
import { useTranslation } from "react-i18next";
import { JSX, useEffect, useState } from "react";
import { Breakpoint, Spacing } from "@/lib/constants/ui.constants";

const { TextArea } = Input;
const { Text, Title } = Typography;

enum ReviewFormField {
  RATING = "rating",
  RATING_DETAILS = "rating_details",
  PROFESSIONALISM = "professionalism",
  PUNCTUALITY = "punctuality",
  COMMUNICATION = "communication",
  SERVICE_QUALITY = "service_quality",
  COMMENT = "comment",
}

enum ReviewValidationRule {
  MIN_COMMENT_LENGTH = 10,
  MAX_COMMENT_LENGTH = 1000,
}

enum ModalWidth {
  DESKTOP = 640,
  MOBILE = 340,
}

enum RateSize {
  LARGE = 28,
  DEFAULT = 20,
}

enum TextAreaRows {
  DEFAULT = 5,
}

interface ReviewModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (values: {
    rating: number;
    rating_details: {
      professionalism: number;
      punctuality: number;
      communication: number;
      service_quality: number;
    };
    comment: string;
  }) => Promise<void>;
}

export function ReviewModal({
  open,
  onCancel,
  onOk,
}: ReviewModalProps): JSX.Element {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [modalWidth, setModalWidth] = useState<number>(ModalWidth.DESKTOP);
  const [bodyPadding, setBodyPadding] = useState<number>(Spacing.XL);

  useEffect(() => {
    const updateModalWidth = (): void => {
      const isMobile = window.innerWidth <= Breakpoint.MOBILE;
      setModalWidth(isMobile ? ModalWidth.MOBILE : ModalWidth.DESKTOP);
      setBodyPadding(isMobile ? Spacing.LG : Spacing.XL);
    };

    updateModalWidth();
    window.addEventListener("resize", updateModalWidth);

    return () => {
      window.removeEventListener("resize", updateModalWidth);
    };
  }, []);

  const handleModalOk = async (): Promise<void> => {
    const values = await form.validateFields();
    await onOk(values);
    form.resetFields();
  };

  const handleModalCancel = (): void => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      open={open}
      centered
      width={modalWidth}
      onOk={handleModalOk}
      onCancel={handleModalCancel}
      okText={t("common.submit")}
      cancelText={t("common.cancel")}
      title={
        <Title level={4} style={{ margin: 0, color: "var(--ant-color-primary)" }}>
          {t("booking.review.title")}
        </Title>
      }
      styles={{
        body: {
          padding: `${bodyPadding}px`,
        },
      }}
      style={{
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <Form form={form} layout="vertical">
        <Card
          bordered={false}
          style={{
            background: "var(--ant-color-fill-tertiary)",
            borderRadius: "12px",
            marginBottom: `${Spacing.XL}px`,
            border: "1px solid var(--ant-color-border-secondary)",
          }}
        >
          <Form.Item
            name={ReviewFormField.RATING}
            label={
              <Text strong style={{ color: "var(--ant-color-primary)" }}>
                {t("booking.review.overallRating")}
              </Text>
            }
            rules={[
              {
                required: true,
                message: t("booking.review.ratingRequired"),
              },
            ]}
            style={{ marginBottom: 0 }}
          >
            <Space
              orientation="vertical"
              size={Spacing.SM}
              style={{ width: "100%" }}
            >
              <Rate
                style={{
                  fontSize: RateSize.LARGE,
                  color: "var(--ant-color-primary)",
                }}
              />
            </Space>
          </Form.Item>
        </Card>

        <Title
          level={5}
          style={{
            marginTop: 0,
            marginBottom: `${Spacing.LG}px`,
            color: "var(--ant-color-primary)",
          }}
        >
          {t("booking.review.detailedRatings")}
        </Title>

        <Row
          gutter={[
            Spacing.XL,
            Spacing.LG,
          ]}
        >
          <Col
            xs={24}
            sm={24}
            md={12}
            lg={12}
          >
            <Form.Item
              name={[ReviewFormField.RATING_DETAILS, ReviewFormField.PROFESSIONALISM]}
              label={t("booking.review.professionalism")}
              rules={[{ required: true }]}
            >
              <Rate
                style={{
                  fontSize: RateSize.DEFAULT,
                  color: "var(--ant-color-primary)",
                }}
              />
            </Form.Item>
          </Col>

          <Col
            xs={24}
            sm={24}
            md={12}
            lg={12}
          >
            <Form.Item
              name={[ReviewFormField.RATING_DETAILS, ReviewFormField.PUNCTUALITY]}
              label={t("booking.review.punctuality")}
              rules={[{ required: true }]}
            >
              <Rate
                style={{
                  fontSize: RateSize.DEFAULT,
                  color: "var(--ant-color-primary)",
                }}
              />
            </Form.Item>
          </Col>

          <Col
            xs={24}
            sm={24}
            md={12}
            lg={12}
          >
            <Form.Item
              name={[ReviewFormField.RATING_DETAILS, ReviewFormField.COMMUNICATION]}
              label={t("booking.review.communication")}
              rules={[{ required: true }]}
            >
              <Rate
                style={{
                  fontSize: RateSize.DEFAULT,
                  color: "var(--ant-color-primary)",
                }}
              />
            </Form.Item>
          </Col>

          <Col
            xs={24}
            sm={24}
            md={12}
            lg={12}
          >
            <Form.Item
              name={[ReviewFormField.RATING_DETAILS, ReviewFormField.SERVICE_QUALITY]}
              label={t("booking.review.serviceQuality")}
              rules={[{ required: true }]}
            >
              <Rate
                style={{
                  fontSize: RateSize.DEFAULT,
                  color: "var(--ant-color-primary)",
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name={ReviewFormField.COMMENT}
          label={
            <Text strong style={{ color: "var(--ant-color-primary)" }}>
              {t("booking.review.comment")}
            </Text>
          }
          rules={[
            { required: true },
            { min: ReviewValidationRule.MIN_COMMENT_LENGTH },
            { max: ReviewValidationRule.MAX_COMMENT_LENGTH },
          ]}
          style={{ marginTop: `${Spacing.XL}px` }}
        >
          <TextArea
            rows={TextAreaRows.DEFAULT}
            showCount
            maxLength={ReviewValidationRule.MAX_COMMENT_LENGTH}
            placeholder={t("booking.review.commentPlaceholder")}
            style={{
              resize: "vertical",
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
