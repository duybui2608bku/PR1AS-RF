import { Alert, Button, Form, InputNumber, Modal, Select } from "antd";
import { DeleteOutlined, InfoCircleOutlined, PlusOutlined } from "@ant-design/icons";
import type { FormInstance } from "antd/es/form";
import type { TFunction } from "i18next";
import { PricingUnit } from "@/lib/types/worker";
import styles from "./Step2Services.module.scss";

interface PricingFormItem {
  unit?: PricingUnit;
  duration?: number;
  price?: number;
}

interface PricingModalProps {
  open: boolean;
  currentServiceName: string;
  form: FormInstance;
  currency: string;
  onSave: () => void;
  onCancel: () => void;
  t: TFunction;
}

export function PricingModal({
  open,
  currentServiceName,
  form,
  currency,
  onSave,
  onCancel,
  t,
}: PricingModalProps) {
  return (
    <Modal
      title={`${t("worker.setup.step2.pricing.title")}: ${currentServiceName}`}
      open={open}
      onOk={onSave}
      onCancel={onCancel}
      width={600}
      okText={t("worker.setup.step2.pricing.save")}
      cancelText={t("worker.setup.step2.pricing.cancel")}
      centered
    >
      <Alert
        message={t("worker.setup.step2.pricing.info")}
        type="info"
        icon={<InfoCircleOutlined />}
        className={styles.modalInfoAlert}
      />
      <Form form={form} layout="vertical">
        <Form.List name="pricing">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <div key={key} className={styles.modalPricingRow}>
                  <Form.Item
                    {...restField}
                    name={[name, "unit"]}
                    label={t("worker.setup.step2.pricing.unit.label")}
                    rules={[
                      {
                        required: true,
                        message: t("worker.setup.step2.pricing.unit.required"),
                      },
                    ]}
                    className={styles.modalPricingField}
                  >
                    <Select placeholder={t("worker.setup.step2.pricing.unit.label")}>
                      <Select.Option value={PricingUnit.HOURLY}>
                        {t("worker.setup.step2.pricing.unit.hour")}
                      </Select.Option>
                      <Select.Option value={PricingUnit.DAILY}>
                        {t("worker.setup.step2.pricing.unit.day")}
                      </Select.Option>
                      <Select.Option value={PricingUnit.MONTHLY}>
                        {t("worker.setup.step2.pricing.unit.month")}
                      </Select.Option>
                    </Select>
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "duration"]}
                    label={t("worker.setup.step2.pricing.duration.label")}
                    rules={[
                      {
                        required: true,
                        message: t("worker.setup.step2.pricing.duration.required"),
                      },
                      {
                        type: "number",
                        min: 1,
                        message: t("worker.setup.step2.pricing.duration.min"),
                      },
                    ]}
                    className={styles.modalPricingField}
                  >
                    <InputNumber
                      placeholder={t("worker.setup.step2.pricing.duration.placeholder")}
                      min={1}
                      className={styles.modalNumberInput}
                      addonAfter={
                        <Form.Item
                          {...restField}
                          name={[name, "unit"]}
                          noStyle
                          shouldUpdate={(prevValues, currentValues) =>
                            (prevValues as { pricing?: PricingFormItem[] }).pricing?.[name]
                              ?.unit !==
                            (currentValues as { pricing?: PricingFormItem[] }).pricing?.[
                              name
                            ]?.unit
                          }
                        >
                          {({ getFieldValue }) => {
                            const unit = getFieldValue(["pricing", name, "unit"]);
                            return unit === PricingUnit.HOURLY
                              ? t("worker.setup.step2.selected.hour")
                              : unit === PricingUnit.DAILY
                              ? t("worker.setup.step2.selected.day")
                              : t("worker.setup.step2.selected.month");
                          }}
                        </Form.Item>
                      }
                    />
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    name={[name, "price"]}
                    label={t("worker.setup.step2.pricing.price.label")}
                    rules={[
                      {
                        required: true,
                        message: t("worker.setup.step2.pricing.price.required"),
                      },
                      {
                        type: "number",
                        min: 0.01,
                        message: t("worker.setup.step2.pricing.price.min"),
                      },
                    ]}
                    className={styles.modalPricingField}
                  >
                    <InputNumber
                      placeholder={t("worker.setup.step2.pricing.price.placeholder")}
                      min={0}
                      step={0.01}
                      className={styles.modalNumberInput}
                      addonAfter={currency}
                    />
                  </Form.Item>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => remove(name)}
                    className={styles.modalRemoveButton}
                  />
                </div>
              ))}
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
              >
                {t("worker.setup.step2.pricing.add")}
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}
