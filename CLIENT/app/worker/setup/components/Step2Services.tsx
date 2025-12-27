"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Button,
  Space,
  Checkbox,
  Form,
  InputNumber,
  Select,
  Divider,
  Tag,
  Empty,
  Spin,
  Alert,
  Modal,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useApiQueryData, useApiMutation } from "@/lib/hooks/use-api";
import { servicesApi } from "@/lib/api/worker.api";
import type {
  Service,
  ServiceCategory,
  WorkerServiceInput,
  ServicePricing,
  PricingUnit,
} from "@/lib/types/worker";
import {
  ServiceCategory as ServiceCategoryEnum,
  PricingUnit as PricingUnitEnum,
} from "@/lib/types/worker";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useCurrencyStore } from "@/lib/stores/currency.store";

const { Title, Text, Paragraph } = Typography;

interface Step2ServicesProps {
  onNext: (data: WorkerServiceInput) => void;
  onBack: () => void;
}

interface SelectedService extends Service {
  pricing: ServicePricing[];
  is_active: boolean;
}

export const Step2Services: React.FC<Step2ServicesProps> = ({
  onNext,
  onBack,
}) => {
  const { t } = useI18n();
  const { currency, formatCurrency } = useCurrencyStore();
  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategory | null>(null);
  const [selectedServices, setSelectedServices] = useState<
    Map<string, SelectedService>
  >(new Map());
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [currentServiceForPricing, setCurrentServiceForPricing] =
    useState<Service | null>(null);
  const [pricingForm] = Form.useForm();

  const {
    data: servicesResponse,
    isLoading: isLoadingServices,
    refetch: refetchServices,
  } = useApiQueryData<{ services: Service[]; count: number }>(
    ["services", selectedCategory || "all"],
    selectedCategory ? `/services?category=${selectedCategory}` : "/services",
    {
      enabled: !!selectedCategory,
      staleTime: 0,
      refetchOnMount: true,
    }
  );

  const services = servicesResponse?.services || [];

  useEffect(() => {
    if (selectedCategory) {
      refetchServices();
    }
  }, [selectedCategory, refetchServices]);

  const handleCategorySelect = (category: ServiceCategory) => {
    setSelectedCategory(category);
  };

  const handleServiceToggle = (service: Service) => {
    const serviceId = service.id;
    const newSelectedServices = new Map(selectedServices);

    if (newSelectedServices.has(serviceId)) {
      newSelectedServices.delete(serviceId);
    } else {
      newSelectedServices.set(serviceId, {
        ...service,
        pricing: [],
        is_active: true,
      });
    }

    setSelectedServices(newSelectedServices);
  };

  const handleOpenPricingModal = (service: Service) => {
    setCurrentServiceForPricing(service);
    const existingService = selectedServices.get(service.id);
    if (existingService && existingService.pricing.length > 0) {
      const pricingValues = existingService.pricing.map((p) => ({
        unit: p.unit,
        duration: p.duration,
        price: p.price,
      }));
      pricingForm.setFieldsValue({ pricing: pricingValues });
    } else {
      pricingForm.resetFields();
    }
    setPricingModalVisible(true);
  };

  const handleSavePricing = () => {
    pricingForm.validateFields().then((values) => {
      if (!currentServiceForPricing) return;

      const pricing: ServicePricing[] = values.pricing
        .filter((p: any) => p && p.unit && p.duration && p.price)
        .map((p: any) => ({
          unit: p.unit as PricingUnit,
          duration: Number(p.duration),
          price: Number(p.price),
        }));

      if (pricing.length === 0) {
        Modal.error({
          title: t("common.error"),
          content: t("worker.setup.step2.validation.minPricing"),
        });
        return;
      }

      const newSelectedServices = new Map(selectedServices);
      const existingService = newSelectedServices.get(
        currentServiceForPricing.id
      );
      if (existingService) {
        newSelectedServices.set(currentServiceForPricing.id, {
          ...existingService,
          pricing,
        });
      }
      setSelectedServices(newSelectedServices);
      setPricingModalVisible(false);
      pricingForm.resetFields();
    });
  };

  const handleRemoveService = (serviceId: string) => {
    const newSelectedServices = new Map(selectedServices);
    newSelectedServices.delete(serviceId);
    setSelectedServices(newSelectedServices);
  };

  const handleSubmit = () => {
    if (selectedServices.size === 0) {
      Modal.warning({
        title: t("common.warning"),
        content: t("worker.setup.step2.validation.noServices"),
      });
      return;
    }

    const servicesWithoutPricing = Array.from(selectedServices.values()).filter(
      (s) => s.pricing.length === 0
    );

    if (servicesWithoutPricing.length > 0) {
      Modal.warning({
        title: t("common.warning"),
        content: `${t(
          "worker.setup.step2.validation.noPricing"
        )}: ${servicesWithoutPricing.map((s) => s.name.vi).join(", ")}`,
      });
      return;
    }

    const workerServices: WorkerServiceInput = {
      services: Array.from(selectedServices.values()).map((service) => ({
        service_id: service.id,
        pricing: service.pricing,
      })),
    };

    onNext(workerServices);
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <Paragraph type="secondary" style={{ fontSize: 16, marginBottom: 0 }}>
          {t("worker.setup.step2.subtitle")}
        </Paragraph>
      </div>

      <div style={{ marginBottom: 32 }}>
        <Text
          strong
          style={{ display: "block", marginBottom: 16, fontSize: 16 }}
        >
          {t("worker.setup.step2.category.label")}
        </Text>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 16,
          }}
        >
          <Card
            hoverable
            onClick={() => handleCategorySelect(ServiceCategoryEnum.ASSISTANCE)}
            style={{
              cursor: "pointer",
              transition: "all 0.2s",
              border:
                selectedCategory === ServiceCategoryEnum.ASSISTANCE
                  ? "2px solid var(--ant-color-primary)"
                  : "1px solid var(--ant-color-border)",
              boxShadow:
                selectedCategory === ServiceCategoryEnum.ASSISTANCE
                  ? "0 4px 12px rgba(0,0,0,0.15)"
                  : "0 2px 8px rgba(0,0,0,0.1)",
              backgroundColor:
                selectedCategory === ServiceCategoryEnum.ASSISTANCE
                  ? "var(--ant-color-primary-bg)"
                  : undefined,
            }}
          >
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <Title
                level={4}
                style={{
                  margin: 0,
                  color:
                    selectedCategory === ServiceCategoryEnum.ASSISTANCE
                      ? "var(--ant-color-primary)"
                      : undefined,
                }}
              >
                {t("worker.setup.step2.category.assistance")}
              </Title>
            </div>
          </Card>
          <Card
            hoverable
            onClick={() =>
              handleCategorySelect(ServiceCategoryEnum.COMPANIONSHIP)
            }
            style={{
              cursor: "pointer",
              transition: "all 0.2s",
              border:
                selectedCategory === ServiceCategoryEnum.COMPANIONSHIP
                  ? "2px solid var(--ant-color-primary)"
                  : "1px solid var(--ant-color-border)",
              boxShadow:
                selectedCategory === ServiceCategoryEnum.COMPANIONSHIP
                  ? "0 4px 12px rgba(0,0,0,0.15)"
                  : "0 2px 8px rgba(0,0,0,0.1)",
              backgroundColor:
                selectedCategory === ServiceCategoryEnum.COMPANIONSHIP
                  ? "var(--ant-color-primary-bg)"
                  : undefined,
            }}
          >
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <Title
                level={4}
                style={{
                  margin: 0,
                  color:
                    selectedCategory === ServiceCategoryEnum.COMPANIONSHIP
                      ? "var(--ant-color-primary)"
                      : undefined,
                }}
              >
                {t("worker.setup.step2.category.companionship")}
              </Title>
            </div>
          </Card>
        </div>
      </div>

      {selectedCategory && (
        <div style={{ marginBottom: 32 }}>
          <Text strong style={{ display: "block", marginBottom: 12 }}>
            {t("worker.setup.step2.services.label")}
          </Text>
          {isLoadingServices ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "32px 0",
              }}
            >
              <Spin size="large" />
            </div>
          ) : services && services.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {services.map((service) => {
                const isSelected = selectedServices.has(service.id);
                const selectedService = selectedServices.get(service.id);
                const hasPricing =
                  selectedService && selectedService.pricing.length > 0;

                return (
                  <Card
                    key={service.id}
                    hoverable
                    style={{
                      cursor: "pointer",
                      transition: "all 0.2s",
                      border: isSelected
                        ? "2px solid var(--ant-color-primary)"
                        : undefined,
                      boxShadow: isSelected
                        ? "0 4px 12px rgba(0,0,0,0.15)"
                        : undefined,
                    }}
                    onClick={() => handleServiceToggle(service)}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleServiceToggle(service)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {hasPricing && (
                        <Tag color="green" icon={<CheckCircleOutlined />}>
                          {t("worker.setup.step2.services.pricingSet")}
                        </Tag>
                      )}
                    </div>
                    <Title level={5} style={{ marginBottom: 8 }}>
                      {service.name.vi}
                    </Title>
                    <Paragraph
                      type="secondary"
                      style={{
                        fontSize: 14,
                        marginBottom: 12,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {service.description.vi}
                    </Paragraph>
                    {service.rules && (
                      <div
                        style={{
                          marginBottom: 12,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 4,
                        }}
                      >
                        {service.rules.physical_touch && (
                          <Tag color="orange">Physical Touch</Tag>
                        )}
                        {service.rules.intellectual_conversation_required && (
                          <Tag color="blue">Intellectual Conversation</Tag>
                        )}
                        <Tag>{service.rules.dress_code}</Tag>
                      </div>
                    )}
                    {isSelected && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPricingModal(service);
                        }}
                        style={{ width: "100%", marginTop: 8 }}
                      >
                        {hasPricing
                          ? t("worker.setup.step2.services.updatePricing")
                          : t("worker.setup.step2.services.setPricing")}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Empty description={t("worker.setup.step2.services.noServices")} />
          )}
        </div>
      )}

      {selectedServices.size > 0 && (
        <div style={{ marginTop: 48 }}>
          <Divider />
          <Title level={4} style={{ marginBottom: 16 }}>
            {t("worker.setup.step2.selected.title")} ({selectedServices.size})
          </Title>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Array.from(selectedServices.values()).map((service) => (
              <Card key={service.id} size="small">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Title level={5} className="mb-1">
                      {service.name.vi}
                    </Title>
                    {service.pricing.length > 0 ? (
                      <div className="space-y-1">
                        {service.pricing.map((p, index) => (
                          <Tag key={index} color="green">
                            {formatCurrency(p.price)} / {p.duration}{" "}
                            {p.unit === PricingUnitEnum.HOURLY
                              ? t("worker.setup.step2.selected.hour")
                              : p.unit === PricingUnitEnum.DAILY
                              ? t("worker.setup.step2.selected.day")
                              : t("worker.setup.step2.selected.month")}
                          </Tag>
                        ))}
                      </div>
                    ) : (
                      <Alert
                        message={t("worker.setup.step2.services.noPricing")}
                        type="warning"
                        showIcon
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </div>
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleOpenPricingModal(service)}
                    >
                      {service.pricing.length > 0
                        ? t("worker.setup.step2.services.editPricing")
                        : t("worker.setup.step2.services.setPricing")}
                    </Button>
                    <Button
                      type="link"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveService(service.id)}
                    >
                      {t("worker.setup.step2.services.remove")}
                    </Button>
                  </Space>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 48,
          display: "flex",
          justifyContent: "space-between",
          paddingTop: 24,
          borderTop: "1px solid var(--ant-color-border-secondary)",
        }}
      >
        <Button onClick={onBack} size="large">
          {t("worker.setup.step2.back")}
        </Button>
        <Button type="primary" onClick={handleSubmit} size="large">
          {t("worker.setup.step2.complete")}
        </Button>
      </div>

      <Modal
        title={`${t("worker.setup.step2.pricing.title")}: ${
          currentServiceForPricing?.name.vi || ""
        }`}
        open={pricingModalVisible}
        onOk={handleSavePricing}
        onCancel={() => {
          setPricingModalVisible(false);
          pricingForm.resetFields();
        }}
        width={600}
        okText={t("worker.setup.step2.pricing.save")}
        cancelText={t("worker.setup.step2.pricing.cancel")}
      >
        <Alert
          message={t("worker.setup.step2.pricing.info")}
          type="info"
          icon={<InfoCircleOutlined />}
          className="mb-4"
        />
        <Form form={pricingForm} layout="vertical">
          <Form.List name="pricing">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="flex gap-2 items-start mb-4">
                    <Form.Item
                      {...restField}
                      name={[name, "unit"]}
                      label={t("worker.setup.step2.pricing.unit.label")}
                      rules={[
                        {
                          required: true,
                          message: t(
                            "worker.setup.step2.pricing.unit.required"
                          ),
                        },
                      ]}
                      className="flex-1"
                    >
                      <Select
                        placeholder={t("worker.setup.step2.pricing.unit.label")}
                      >
                        <Select.Option value={PricingUnitEnum.HOURLY}>
                          {t("worker.setup.step2.pricing.unit.hour")}
                        </Select.Option>
                        <Select.Option value={PricingUnitEnum.DAILY}>
                          {t("worker.setup.step2.pricing.unit.day")}
                        </Select.Option>
                        <Select.Option value={PricingUnitEnum.MONTHLY}>
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
                          message: t(
                            "worker.setup.step2.pricing.duration.required"
                          ),
                        },
                        {
                          type: "number",
                          min: 1,
                          message: t("worker.setup.step2.pricing.duration.min"),
                        },
                      ]}
                      className="flex-1"
                    >
                      <InputNumber
                        placeholder={t(
                          "worker.setup.step2.pricing.duration.placeholder"
                        )}
                        min={1}
                        className="w-full"
                        addonAfter={
                          <Form.Item
                            {...restField}
                            name={[name, "unit"]}
                            noStyle
                            shouldUpdate={(prevValues, currentValues) =>
                              (prevValues as any).pricing?.[name]?.unit !==
                              (currentValues as any).pricing?.[name]?.unit
                            }
                          >
                            {({ getFieldValue }) => {
                              const unit = getFieldValue([
                                "pricing",
                                name,
                                "unit",
                              ]);
                              return unit === PricingUnitEnum.HOURLY
                                ? t("worker.setup.step2.selected.hour")
                                : unit === PricingUnitEnum.DAILY
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
                          message: t(
                            "worker.setup.step2.pricing.price.required"
                          ),
                        },
                        {
                          type: "number",
                          min: 0.01,
                          message: t("worker.setup.step2.pricing.price.min"),
                        },
                      ]}
                      className="flex-1"
                    >
                      <InputNumber
                        placeholder={t(
                          "worker.setup.step2.pricing.price.placeholder"
                        )}
                        min={0}
                        step={0.01}
                        className="w-full"
                        addonAfter={currency}
                      />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                      className="mt-6"
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
    </div>
  );
};
