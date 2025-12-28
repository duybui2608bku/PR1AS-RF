"use client";

import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Upload,
  Button,
  Space,
  Typography,
  Tag,
  message,
  Card,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import ImgCrop from "antd-img-crop";
import dayjs, { type Dayjs } from "dayjs";
import { useApiQueryData } from "@/lib/hooks/use-api";
import type {
  WorkerProfile,
  WorkerProfileUpdateInput,
  Gender,
} from "@/lib/types/worker";
import { STAR_SIGNS, Experience } from "@/lib/types/worker";
import { useI18n } from "@/lib/hooks/use-i18n";
import { uploadImage } from "@/lib/utils/upload";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";

const { TextArea } = Input;
const { Title, Text } = Typography;

interface Step1BasicInfoProps {
  onNext: (data: WorkerProfileUpdateInput) => void;
  initialData?: WorkerProfile | null;
  isPending?: boolean;
}

type SubStep =
  | "location"
  | "birthday-gender"
  | "height-weight"
  | "experience-title"
  | "star-sign"
  | "lifestyle"
  | "hobbies"
  | "introduction"
  | "quote"
  | "gallery";

const SUB_STEPS: SubStep[] = [
  "location",
  "birthday-gender",
  "height-weight",
  "experience-title",
  "star-sign",
  "lifestyle",
  "hobbies",
  "introduction",
  "quote",
  "gallery",
];

export const Step1BasicInfo: React.FC<Step1BasicInfoProps> = ({
  onNext,
  initialData,
  isPending = false,
}) => {
  const { t } = useI18n();
  const { handleError } = useErrorHandler();
  const [form] = Form.useForm();
  const [currentSubStep, setCurrentSubStep] = useState<number>(0);

  const [stepData, setStepData] = useState<Partial<WorkerProfileUpdateInput>>({
    coords: { latitude: null, longitude: null },
    date_of_birth: undefined,
    gender: undefined,
    height_cm: undefined,
    weight_kg: undefined,
    experience: undefined,
    title: undefined,
    star_sign: undefined,
    lifestyle: undefined,
    hobbies: [],
    introduction: undefined,
    quote: undefined,
    gallery_urls: [],
  });

  const [hobbies, setHobbies] = useState<string[]>([]);
  const [hobbyInput, setHobbyInput] = useState("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [location, setLocation] = useState<{
    lat: number | null;
    lng: number | null;
  }>({
    lat: null,
    lng: null,
  });

  const { data: profileData, isLoading } = useApiQueryData<{
    user: { worker_profile: WorkerProfile | null };
  }>(["worker-profile"], "/auth/me", {
    enabled: !initialData && typeof window !== "undefined",
  });

  useEffect(() => {
    if (profileData?.user?.worker_profile) {
      const profile = profileData.user.worker_profile;
      form.setFieldsValue({
        date_of_birth: profile.date_of_birth
          ? dayjs(profile.date_of_birth)
          : undefined,
        gender: profile.gender,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        experience: profile.experience,
        title: profile.title,
        star_sign: profile.star_sign,
        lifestyle: profile.lifestyle,
        quote: profile.quote,
        introduction: profile.introduction,
      });
      setHobbies(profile.hobbies || []);
      setStepData({
        ...stepData,
        hobbies: profile.hobbies || [],
      });
      setFileList(
        profile.gallery_urls?.map((url, index) => ({
          uid: `-${index}`,
          name: `image-${index}.jpg`,
          status: "done",
          url,
        })) || []
      );
      if (profile.coords?.latitude && profile.coords?.longitude) {
        setLocation({
          lat: profile.coords.latitude,
          lng: profile.coords.longitude,
        });
        setStepData({
          ...stepData,
          coords: {
            latitude: profile.coords.latitude,
            longitude: profile.coords.longitude,
          },
        });
      }
    } else if (initialData) {
      form.setFieldsValue({
        date_of_birth: initialData.date_of_birth
          ? dayjs(initialData.date_of_birth)
          : undefined,
        gender: initialData.gender,
        height_cm: initialData.height_cm,
        weight_kg: initialData.weight_kg,
        experience: initialData.experience,
        title: initialData.title,
        star_sign: initialData.star_sign,
        lifestyle: initialData.lifestyle,
        quote: initialData.quote,
        introduction: initialData.introduction,
      });
      setHobbies(initialData.hobbies || []);
      setStepData({
        ...stepData,
        hobbies: initialData.hobbies || [],
      });
      setFileList(
        initialData.gallery_urls?.map((url, index) => ({
          uid: `-${index}`,
          name: `image-${index}.jpg`,
          status: "done",
          url,
        })) || []
      );
    }
  }, [profileData, initialData, form]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      message.error(t("worker.setup.step1.location.notSupported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(newLocation);
        setStepData({
          ...stepData,
          coords: {
            latitude: newLocation.lat,
            longitude: newLocation.lng,
          },
        });
        message.success(t("worker.setup.step1.location.success"));
      },
      (error) => {
        message.error(
          `${t("worker.setup.step1.location.error")}: ${error.message}`
        );
      }
    );
  };

  const handleAddHobby = () => {
    if (hobbyInput.trim() && !hobbies.includes(hobbyInput.trim())) {
      const newHobbies = [...hobbies, hobbyInput.trim()];
      setHobbies(newHobbies);
      setStepData({
        ...stepData,
        hobbies: newHobbies,
      });
      setHobbyInput("");
    }
  };

  const handleRemoveHobby = (hobby: string) => {
    const newHobbies = hobbies.filter((h) => h !== hobby);
    setHobbies(newHobbies);
    setStepData({
      ...stepData,
      hobbies: newHobbies,
    });
  };

  const handleUploadChange: UploadProps["onChange"] = async (info) => {
    let newFileList = [...info.fileList];

    const filesToUpload = newFileList.filter(
      (file) =>
        file.originFileObj &&
        !file.url &&
        file.status !== "error" &&
        file.status !== "uploading" &&
        file.status !== "done"
    );

    if (filesToUpload.length > 0) {
      filesToUpload.forEach((file) => {
        file.status = "uploading";
      });
      setFileList([...newFileList]);
    }

    const uploadPromises = filesToUpload.map(async (file) => {
      try {
        const imageUrl = await uploadImage(file.originFileObj!);
        file.status = "done";
        file.url = imageUrl;
        message.success(t("upload.image.success", { fileName: file.name }));
      } catch (error) {
        file.status = "error";
        const errorMessage =
          error instanceof Error ? error.message : t("errors.unknown.message");
        message.error(
          t("upload.image.error", {
            fileName: file.name,
            errorMessage,
          })
        );
      }
    });

    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }

    const MAX_GALLERY_IMAGES = 10;
    newFileList = newFileList.slice(-MAX_GALLERY_IMAGES);
    setFileList(newFileList);
    setStepData({
      ...stepData,
      gallery_urls: newFileList
        .filter((file) => file.status === "done" && file.url)
        .map((file) => file.url || "")
        .filter(Boolean),
    });
  };

  const beforeUpload = (file: File) => {
    const isJpgOrPng =
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/webp";
    if (!isJpgOrPng) {
      message.error(t("worker.setup.step1.gallery.invalidFormat"));
      return false;
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error(t("worker.setup.step1.gallery.tooLarge"));
      return false;
    }
    return false;
  };

  const handleNext = () => {
    const currentStepType = SUB_STEPS[currentSubStep];

    if (currentStepType === "location") {
      if (!location.lat || !location.lng) {
        message.warning(t("worker.setup.step1.location.required"));
        return;
      }
    } else if (currentStepType === "birthday-gender") {
      form.validateFields(["date_of_birth", "gender"]).catch(() => {
        message.warning(t("worker.setup.step1.validation.fillAll"));
        return;
      });
      const values = form.getFieldsValue(["date_of_birth", "gender"]);
      setStepData({
        ...stepData,
        date_of_birth: values.date_of_birth
          ? values.date_of_birth.format("YYYY-MM-DD")
          : undefined,
        gender: values.gender as Gender,
      });
    } else if (currentStepType === "height-weight") {
      const values = form.getFieldsValue(["height_cm", "weight_kg"]);
      setStepData({
        ...stepData,
        height_cm: values.height_cm,
        weight_kg: values.weight_kg,
      });
    } else if (currentStepType === "experience-title") {
      const values = form.getFieldsValue(["experience", "title"]);
      setStepData({
        ...stepData,
        experience: values.experience,
        title: values.title,
      });
    } else if (currentStepType === "star-sign") {
      const values = form.getFieldsValue(["star_sign"]);
      setStepData({
        ...stepData,
        star_sign: values.star_sign,
      });
    } else if (currentStepType === "lifestyle") {
      const values = form.getFieldsValue(["lifestyle"]);
      setStepData({
        ...stepData,
        lifestyle: values.lifestyle,
      });
    } else if (currentStepType === "hobbies") {
    } else if (currentStepType === "introduction") {
      const values = form.getFieldsValue(["introduction"]);
      setStepData({
        ...stepData,
        introduction: values.introduction,
      });
    } else if (currentStepType === "quote") {
      const values = form.getFieldsValue(["quote"]);
      setStepData({
        ...stepData,
        quote: values.quote,
      });
    } else if (currentStepType === "gallery") {
    }

    if (currentSubStep < SUB_STEPS.length - 1) {
      setCurrentSubStep(currentSubStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentSubStep > 0) {
      setCurrentSubStep(currentSubStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const formData: WorkerProfileUpdateInput = {
        ...stepData,
        date_of_birth: stepData.date_of_birth as string | undefined,
        gender: stepData.gender as Gender,
        hobbies: stepData.hobbies as string[],
        gallery_urls: stepData.gallery_urls as string[],
      };

      onNext(formData);
    } catch (error) {
      handleError(error);
    }
  };

  const renderSubStep = () => {
    const currentStepType = SUB_STEPS[currentSubStep];

    switch (currentStepType) {
      case "location":
        return (
          <Card
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Title level={3} style={{ marginBottom: 24, textAlign: "center" }}>
              {t("worker.setup.step1.location.label")}
            </Title>
            <Space direction="vertical" style={{ width: "100%" }} size="large">
              <Button
                icon={<EnvironmentOutlined />}
                onClick={getLocation}
                type="primary"
                size="large"
                block
              >
                {t("worker.setup.step1.location.getLocation")}
              </Button>
              {location.lat && location.lng && (
                <div
                  style={{
                    textAlign: "center",
                    padding: 16,
                    background: "var(--ant-color-fill-tertiary)",
                    borderRadius: 8,
                  }}
                >
                  <Text
                    type="secondary"
                    style={{ display: "block", marginBottom: 8 }}
                  >
                    {t("worker.setup.step1.location.success")}
                  </Text>
                  <Text>
                    {t("worker.setup.step1.location.latitude")}:{" "}
                    {location.lat.toFixed(6)},{" "}
                    {t("worker.setup.step1.location.longitude")}:{" "}
                    {location.lng.toFixed(6)}
                  </Text>
                </div>
              )}
            </Space>
          </Card>
        );

      case "birthday-gender":
        return (
          <Card
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Title level={3} style={{ marginBottom: 24, textAlign: "center" }}>
              {t("worker.setup.step1.dateOfBirth.label")} &{" "}
              {t("worker.setup.step1.gender.label")}
            </Title>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                gender: stepData.gender || "MALE",
              }}
            >
              <Form.Item
                label={t("worker.setup.step1.dateOfBirth.label")}
                name="date_of_birth"
              >
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                  size="large"
                />
              </Form.Item>
              <Form.Item
                label={t("worker.setup.step1.gender.label")}
                name="gender"
                rules={[
                  {
                    required: true,
                    message: t("worker.setup.step1.gender.required"),
                  },
                ]}
              >
                <Select size="large">
                  <Select.Option value="MALE">
                    {t("worker.setup.step1.gender.male")}
                  </Select.Option>
                  <Select.Option value="FEMALE">
                    {t("worker.setup.step1.gender.female")}
                  </Select.Option>
                  <Select.Option value="OTHER">
                    {t("worker.setup.step1.gender.other")}
                  </Select.Option>
                </Select>
              </Form.Item>
            </Form>
          </Card>
        );

      case "height-weight":
        return (
          <Card
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Title level={3} style={{ marginBottom: 24, textAlign: "center" }}>
              {t("worker.setup.step1.heightWeight.label")}
            </Title>
            <Form form={form} layout="vertical">
              <Form.Item
                label={t("worker.setup.step1.heightWeight.height")}
                name="height_cm"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder={t("worker.setup.step1.heightWeight.height")}
                  min={0}
                  max={300}
                  addonAfter="cm"
                  size="large"
                />
              </Form.Item>
              <Form.Item
                label={t("worker.setup.step1.heightWeight.weight")}
                name="weight_kg"
              >
                <InputNumber
                  style={{ width: "100%" }}
                  placeholder={t("worker.setup.step1.heightWeight.weight")}
                  min={0}
                  max={500}
                  addonAfter="kg"
                  size="large"
                />
              </Form.Item>
            </Form>
          </Card>
        );

      case "experience-title":
        return (
          <Card
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Title level={3} style={{ marginBottom: 24, textAlign: "center" }}>
              {t("worker.setup.step1.experienceTitle.label")}
            </Title>
            <Form form={form} layout="vertical">
              <Form.Item
                label={t("worker.setup.step1.experience.label")}
                name="experience"
              >
                <Select
                  placeholder={t("worker.setup.step1.experience.placeholder")}
                  size="large"
                  allowClear
                >
                  <Select.Option value={Experience.LESS_THAN_1}>
                    {t("worker.setup.step1.experience.lessThan1")}
                  </Select.Option>
                  <Select.Option value={Experience.ONE_TO_3}>
                    {t("worker.setup.step1.experience.oneTo3")}
                  </Select.Option>
                  <Select.Option value={Experience.THREE_TO_5}>
                    {t("worker.setup.step1.experience.threeTo5")}
                  </Select.Option>
                  <Select.Option value={Experience.FIVE_TO_10}>
                    {t("worker.setup.step1.experience.fiveTo10")}
                  </Select.Option>
                  <Select.Option value={Experience.MORE_THAN_10}>
                    {t("worker.setup.step1.experience.moreThan10")}
                  </Select.Option>
                </Select>
              </Form.Item>
              <Form.Item
                label={t("worker.setup.step1.title.label")}
                name="title"
              >
                <Input
                  placeholder={t("worker.setup.step1.title.placeholder")}
                  size="large"
                  maxLength={100}
                  showCount
                />
              </Form.Item>
            </Form>
          </Card>
        );

      case "star-sign":
        return (
          <Card
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Title level={3} style={{ marginBottom: 24, textAlign: "center" }}>
              {t("worker.setup.step1.starSign.label")}
            </Title>
            <Form form={form} layout="vertical">
              <Form.Item
                label={t("worker.setup.step1.starSign.label")}
                name="star_sign"
              >
                <Select
                  placeholder={t("worker.setup.step1.starSign.placeholder")}
                  size="large"
                >
                  {STAR_SIGNS.map((sign) => (
                    <Select.Option key={sign.value} value={sign.value}>
                      {t(`worker.setup.step1.starSign.${sign.value}`)}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Card>
        );

      case "lifestyle":
        return (
          <Card
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Title level={3} style={{ marginBottom: 24, textAlign: "center" }}>
              {t("worker.setup.step1.lifestyle.label")}
            </Title>
            <Form form={form} layout="vertical">
              <Form.Item
                label={t("worker.setup.step1.lifestyle.label")}
                name="lifestyle"
              >
                <TextArea
                  rows={4}
                  placeholder={t("worker.setup.step1.lifestyle.placeholder")}
                />
              </Form.Item>
            </Form>
          </Card>
        );

      case "hobbies":
        return (
          <Card
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Title level={3} style={{ marginBottom: 24, textAlign: "center" }}>
              {t("worker.setup.step1.hobbies.label")}
            </Title>
            <Space direction="vertical" style={{ width: "100%" }} size="large">
              <Space.Compact style={{ width: "100%" }}>
                <Input
                  value={hobbyInput}
                  onChange={(e) => setHobbyInput(e.target.value)}
                  onPressEnter={handleAddHobby}
                  placeholder={t("worker.setup.step1.hobbies.placeholder")}
                  style={{ flex: 1 }}
                  size="large"
                />
                <Button
                  icon={<PlusOutlined />}
                  onClick={handleAddHobby}
                  size="large"
                >
                  {t("worker.setup.step1.hobbies.add")}
                </Button>
              </Space.Compact>
              {hobbies.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {hobbies.map((hobby) => (
                    <Tag
                      key={hobby}
                      closable
                      onClose={() => handleRemoveHobby(hobby)}
                      style={{
                        marginBottom: 8,
                        fontSize: 14,
                        padding: "4px 12px",
                      }}
                    >
                      {hobby}
                    </Tag>
                  ))}
                </div>
              )}
            </Space>
          </Card>
        );

      case "introduction":
        return (
          <Card
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Title level={3} style={{ marginBottom: 24, textAlign: "center" }}>
              {t("worker.setup.step1.introduction.label")}
            </Title>
            <Form form={form} layout="vertical">
              <Form.Item
                label={t("worker.setup.step1.introduction.label")}
                name="introduction"
              >
                <TextArea
                  rows={6}
                  placeholder={t("worker.setup.step1.introduction.placeholder")}
                />
              </Form.Item>
            </Form>
          </Card>
        );

      case "quote":
        return (
          <Card
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Title level={3} style={{ marginBottom: 24, textAlign: "center" }}>
              {t("worker.setup.step1.quote.label")}
            </Title>
            <Form form={form} layout="vertical">
              <Form.Item
                label={t("worker.setup.step1.quote.label")}
                name="quote"
              >
                <TextArea
                  rows={3}
                  placeholder={t("worker.setup.step1.quote.placeholder")}
                />
              </Form.Item>
            </Form>
          </Card>
        );

      case "gallery":
        return (
          <Card
            style={{
              maxWidth: "800px",
              margin: "0 auto",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <Title level={3} style={{ marginBottom: 24, textAlign: "center" }}>
              {t("worker.setup.step1.gallery.label")}
            </Title>
            <Form form={form} layout="vertical">
              <Form.Item label={t("worker.setup.step1.gallery.label")}>
                <ImgCrop
                  aspect={5 / 4}
                  quality={0.9}
                  fillColor="transparent"
                  zoom={true}
                  rotate={true}
                >
                  <Upload
                    listType="picture-card"
                    fileList={fileList}
                    onChange={handleUploadChange}
                    beforeUpload={beforeUpload}
                    maxCount={10}
                    accept="image/*"
                  >
                    {fileList.length < 10 && (
                      <div>
                        <PlusOutlined />
                        <div style={{ marginTop: 8 }}>
                          {t("worker.setup.step1.gallery.upload")}
                        </div>
                      </div>
                    )}
                  </Upload>
                </ImgCrop>
                <Text
                  type="secondary"
                  style={{ display: "block", marginTop: 8 }}
                >
                  {t("worker.setup.step1.gallery.maxImages")}
                </Text>
              </Form.Item>
            </Form>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      {/* Progress indicator */}
      <div style={{ marginBottom: 48, textAlign: "center" }}>
        <Text type="secondary">
          {t("common.step")} {currentSubStep + 1} / {SUB_STEPS.length}
        </Text>
      </div>

      {/* Sub-step content */}
      {renderSubStep()}

      {/* Navigation buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 48,
          paddingTop: 24,
          borderTop: "1px solid var(--ant-color-border-secondary)",
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          disabled={currentSubStep === 0}
          size="large"
        >
          {t("common.back")}
        </Button>
        <Button
          type="primary"
          onClick={handleNext}
          loading={isPending}
          icon={
            currentSubStep === SUB_STEPS.length - 1 ? undefined : (
              <ArrowRightOutlined />
            )
          }
          size="large"
        >
          {currentSubStep === SUB_STEPS.length - 1
            ? t("worker.setup.step1.complete")
            : t("common.next")}
        </Button>
      </div>
    </div>
  );
};
