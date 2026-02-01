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
  Row,
  Col,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useApiQueryData } from "@/lib/hooks/use-api";
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
import { Spacing } from "@/lib/constants/ui.constants";
import styles from "./Step2Services.module.scss";

const { Title, Text, Paragraph } = Typography;

interface Step2ServicesProps {
  onNext: (data: WorkerServiceInput) => void;
  onBack: () => void;
  isPending?: boolean;
}

interface SelectedService extends Service {
  pricing: ServicePricing[];
  is_active: boolean;
}

export const Step2Services: React.FC<Step2ServicesProps> = ({
  onNext,
  onBack,
  isPending = false,
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

  const { data: allServicesResponse, isLoading: isLoadingAllServices } =
    useApiQueryData<{ services: Service[]; count: number }>(
      ["services", "all"],
      "/services",
      {
        enabled: true,
        staleTime: 0,
        refetchOnMount: true,
      }
    );

  const allServices = allServicesResponse?.services || [];

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

  const {
    data: existingWorkerServicesResponse,
    isLoading: isLoadingExistingServices,
  } = useApiQueryData<{
    services: Array<{
      service_id: string;
      service_code: string;
      pricing: Array<{
        unit: string;
        duration: number;
        price: number;
        currency: string;
      }>;
      is_active: boolean;
    }>;
  }>(["worker-services"], "/worker/services", {
    enabled: true,
    staleTime: 0,
    refetchOnMount: true,
  });

  const existingWorkerServices = existingWorkerServicesResponse?.services || [];

  useEffect(() => {
    if (selectedCategory) {
      refetchServices();
    }
  }, [selectedCategory, refetchServices]);

  const [hasLoadedExistingServices, setHasLoadedExistingServices] =
    useState(false);

  useEffect(() => {
    if (
      !hasLoadedExistingServices &&
      existingWorkerServices &&
      Array.isArray(existingWorkerServices) &&
      existingWorkerServices.length > 0 &&
      allServices.length > 0
    ) {
      const serviceMap = new Map(allServices.map((s) => [s.id, s]));
      const newSelectedServices = new Map<string, SelectedService>();

      existingWorkerServices.forEach((workerService) => {
        const service = serviceMap.get(workerService.service_id);
        if (service) {
          newSelectedServices.set(service.id, {
            ...service,
            pricing: workerService.pricing.map((p) => ({
              unit: p.unit as PricingUnit,
              duration: p.duration,
              price: p.price,
            })),
            is_active: workerService.is_active,
          });
        }
      });

      if (newSelectedServices.size > 0) {
        setSelectedServices(newSelectedServices);
      }
      setHasLoadedExistingServices(true);
    }
  }, [existingWorkerServices, allServices, hasLoadedExistingServices]);

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
          centered: true,
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
        centered: true,
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
        centered: true,
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
    <div className={styles.container}>
      <div className={styles.subtitleBlock}>
        <Paragraph type="secondary" className={styles.subtitleText}>
          {t("worker.setup.step2.subtitle")}
        </Paragraph>
      </div>

      <div className={styles.categorySection}>
        <Text strong className={styles.categoryLabel}>
          {t("worker.setup.step2.category.label")}
        </Text>
        <Row gutter={[Spacing.LG, Spacing.LG]}>
          <Col xs={24} sm={12}>
            <Card
              hoverable
              onClick={() => handleCategorySelect(ServiceCategoryEnum.ASSISTANCE)}
              className={`${styles.categoryCard} ${
                selectedCategory === ServiceCategoryEnum.ASSISTANCE ? styles.selected : ""
              }`}
            >
              <div className={styles.categoryCardInner}>
                <Title level={4} className={styles.categoryCardTitle}>
                  {t("worker.setup.step2.category.assistance")}
                </Title>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card
              hoverable
              onClick={() =>
                handleCategorySelect(ServiceCategoryEnum.COMPANIONSHIP)
              }
              className={`${styles.categoryCard} ${
                selectedCategory === ServiceCategoryEnum.COMPANIONSHIP ? styles.selected : ""
              }`}
            >
              <div className={styles.categoryCardInner}>
                <Title level={4} className={styles.categoryCardTitle}>
                  {t("worker.setup.step2.category.companionship")}
                </Title>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {selectedCategory && (
        <div className={styles.servicesSection}>
          <Text strong className={styles.servicesLabel}>
            {t("worker.setup.step2.services.label")}
          </Text>
          {isLoadingServices ? (
            <div className={styles.spinWrapper}>
              <Spin size="large" />
            </div>
          ) : services && services.length > 0 ? (
            <Row gutter={[Spacing.LG, Spacing.LG]} className={styles.servicesGrid}>
              {services.map((service) => {
                const isSelected = selectedServices.has(service.id);
                const selectedService = selectedServices.get(service.id);
                const hasPricing =
                  selectedService && selectedService.pricing.length > 0;

                return (
                  <Col xs={24} sm={12} lg={8} key={service.id}>
                    <Card
                      hoverable
                      className={`${styles.serviceCard} ${isSelected ? styles.selected : ""}`}
                      onClick={() => handleServiceToggle(service)}
                    >
                      <Row className={styles.serviceCardHeader} justify="space-between" align="top">
                        <Col>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleServiceToggle(service)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Col>
                        <Col>
                          {hasPricing && (
                            <Tag color="green" icon={<CheckCircleOutlined />}>
                              {t("worker.setup.step2.services.pricingSet")}
                            </Tag>
                          )}
                        </Col>
                      </Row>
                      <Title level={5} className={styles.serviceCardTitle}>
                        {service.name.vi}
                      </Title>
                      <Paragraph type="secondary" className={styles.serviceCardDesc}>
                        {service.description.vi}
                      </Paragraph>
                      {service.rules && (
                        <Space className={styles.serviceCardRules} size={4} wrap>
                          {service.rules.physical_touch && (
                            <Tag color="orange">Physical Touch</Tag>
                          )}
                          {service.rules.intellectual_conversation_required && (
                            <Tag color="blue">Intellectual Conversation</Tag>
                          )}
                          <Tag>{service.rules.dress_code}</Tag>
                        </Space>
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
                          className={styles.pricingButton}
                        >
                          {hasPricing
                            ? t("worker.setup.step2.services.updatePricing")
                            : t("worker.setup.step2.services.setPricing")}
                        </Button>
                      )}
                    </Card>
                  </Col>
                );
              })}
            </Row>
          ) : (
            <Empty description={t("worker.setup.step2.services.noServices")} />
          )}
        </div>
      )}

      {selectedServices.size > 0 && (
        <div className={styles.selectedSection}>
          <Divider />
          <Title level={4} className={styles.selectedTitle}>
            {t("worker.setup.step2.selected.title")} ({selectedServices.size})
          </Title>
          <Space direction="vertical" size={Spacing.LG} className={styles.selectedList}>
            {Array.from(selectedServices.values()).map((service) => (
              <Card key={service.id} size="small">
                <Row justify="space-between" align="top">
                  <Col flex={1}>
                    <Title level={5} className={styles.serviceCardTitle}>
                      {service.name.vi}
                    </Title>
                    {service.pricing.length > 0 ? (
                      <Space size={4} wrap>
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
                      </Space>
                    ) : (
                      <Alert
                        message={t("worker.setup.step2.services.noPricing")}
                        type="warning"
                        showIcon
                        className={styles.alertMargin}
                      />
                    )}
                  </Col>
                  <Col>
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
                  </Col>
                </Row>
              </Card>
            ))}
          </Space>
        </div>
      )}

      <Row justify="space-between" align="middle" className={styles.navRow}>
        <Col>
          <Button onClick={onBack} size="large">
            {t("worker.setup.step2.back")}
          </Button>
        </Col>
        <Col>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={isPending}
            size="large"
          >
            {t("worker.setup.step2.complete")}
          </Button>
        </Col>
      </Row>

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
        centered
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
