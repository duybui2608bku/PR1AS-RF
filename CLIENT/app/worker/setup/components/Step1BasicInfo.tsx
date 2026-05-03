"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Upload,
  Button,
  Typography,
  Tag,
  message,
  Spin,
} from "antd";
import { PlusOutlined, UserOutlined, PictureOutlined } from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import ImgCrop from "antd-img-crop";
import dayjs from "dayjs";
import { useApiQueryData } from "@/lib/hooks/use-api";
import type {
  WorkerProfile,
  WorkerProfileUpdateInput,
  Gender,
} from "@/lib/types/worker";
import { STAR_SIGNS, Experience } from "@/lib/types/worker";
import { useI18n } from "@/lib/hooks/use-i18n";
import { uploadImage } from "@/lib/utils/upload";
import { searchWorkLocationsMock } from "@/lib/mock/work-locations.mock";
import type { WorkLocationOption } from "@/lib/mock/work-locations.mock";
import styles from "./Step1BasicInfo.module.scss";

const { TextArea } = Input;
const { Title, Text } = Typography;

export interface WorkerProfileStepHandle {
  validateAndGetProfile: () => Promise<WorkerProfileUpdateInput | null>;
}

interface Step1BasicInfoProps {
  initialData?: WorkerProfile | null;
}

export const Step1BasicInfo = forwardRef<
  WorkerProfileStepHandle,
  Step1BasicInfoProps
>(function Step1BasicInfo({ initialData }, ref) {
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [hobbyInput, setHobbyInput] = useState("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [locationOptions, setLocationOptions] = useState<WorkLocationOption[]>(
    []
  );
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistedCoordsRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const { data: profileData, isLoading } = useApiQueryData<{
    user: { worker_profile: WorkerProfile | null };
  }>(["worker-profile"], "/auth/me", {
    enabled: !initialData && typeof window !== "undefined",
  });
  void isLoading;

  const mergeLocationOptions = useCallback((incoming: WorkLocationOption[]) => {
    setLocationOptions((prev) => {
      const map = new Map(prev.map((o) => [o.value, o.label]));
      incoming.forEach((o) => map.set(o.value, o.label));
      return Array.from(map.entries()).map(([value, label]) => ({
        value,
        label,
      }));
    });
  }, []);

  const runLocationSearch = useCallback(
    async (raw: string) => {
      setLocationSearchLoading(true);
      try {
        const res = await searchWorkLocationsMock(raw);
        mergeLocationOptions(res);
      } finally {
        setLocationSearchLoading(false);
      }
    },
    [mergeLocationOptions]
  );

  const handleLocationSearch = useCallback(
    (q: string) => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      searchTimerRef.current = setTimeout(() => {
        void runLocationSearch(q);
      }, 320);
    },
    [runLocationSearch]
  );

  useEffect(() => {
    void runLocationSearch("");
  }, [runLocationSearch]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const profile = profileData?.user?.worker_profile || initialData;
    if (!profile) return;

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
      work_locations: [],
    });

    const nextHobbies = profile.hobbies || [];
    const nextFiles =
      profile.gallery_urls?.map((url, index) => ({
        uid: `-${index}`,
        name: `image-${index}.jpg`,
        status: "done" as const,
        url,
      })) || [];

    if (
      profile.coords?.latitude != null &&
      profile.coords?.longitude != null
    ) {
      persistedCoordsRef.current = {
        latitude: profile.coords.latitude,
        longitude: profile.coords.longitude,
      };
    }

    queueMicrotask(() => {
      setHobbies(nextHobbies);
      setFileList(nextFiles);
    });
  }, [profileData, initialData, form]);

  const handleAddHobby = useCallback(() => {
    if (hobbyInput.trim() && !hobbies.includes(hobbyInput.trim())) {
      setHobbies((h) => [...h, hobbyInput.trim()]);
      setHobbyInput("");
    }
  }, [hobbyInput, hobbies]);

  const handleRemoveHobby = useCallback((hobby: string) => {
    setHobbies((h) => h.filter((x) => x !== hobby));
  }, []);

  const updateGalleryUrls = useCallback((files: UploadFile[]) => {
    setFileList(files);
  }, []);

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
    updateGalleryUrls(newFileList);
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

  useImperativeHandle(ref, () => ({
    validateAndGetProfile: async () => {
      try {
        await form.validateFields();
      } catch {
        return null;
      }

      const v = form.getFieldsValue();
      const gallery_urls = fileList
        .filter((file) => file.status === "done" && file.url)
        .map((file) => file.url || "")
        .filter(Boolean);

      const payload: WorkerProfileUpdateInput = {
        date_of_birth: v.date_of_birth
          ? dayjs(v.date_of_birth).format("YYYY-MM-DD")
          : undefined,
        gender: v.gender as Gender,
        height_cm: v.height_cm,
        weight_kg: v.weight_kg,
        experience: v.experience,
        title: v.title,
        star_sign: v.star_sign,
        lifestyle: v.lifestyle,
        quote: v.quote,
        introduction: v.introduction,
        hobbies,
        gallery_urls,
      };

      if (persistedCoordsRef.current) {
        payload.coords = {
          latitude: persistedCoordsRef.current.latitude,
          longitude: persistedCoordsRef.current.longitude,
        };
      }

      return payload;
    },
  }));

  return (
    <div className={`${styles.container} ${styles.setupSkin}`}>
      <Form
        form={form}
        layout="vertical"
        colon={false}
        className={styles.form}
        initialValues={{ gender: "MALE", work_locations: [] }}
      >
        <section className={styles.stitchSection}>
          <div className={styles.sectionHeader}>
            <UserOutlined className={styles.sectionIcon} aria-hidden />
            <Title level={5} className={styles.sectionTitle}>
              {t("worker.setup.monolith.sectionPersonal")}
            </Title>
          </div>

          <div className={styles.sectionBody}>
          <Form.Item
            className={styles.stitchField}
            name="work_locations"
            label={
              <span className={styles.labelUpper}>
                {t("worker.setup.step1.workAreas.label")}
              </span>
            }
            extra={
              <Text type="secondary" className={styles.fieldHint}>
                {t("worker.setup.step1.workAreas.phase1Hint")}
              </Text>
            }
            rules={[
              {
                required: true,
                message: t("worker.setup.step1.workAreas.required"),
              },
              {
                type: "array",
                min: 1,
                message: t("worker.setup.step1.workAreas.required"),
              },
            ]}
          >
            <Select
              mode="multiple"
              showSearch
              allowClear
              className={styles.inputFull}
              size="middle"
              placeholder={t("worker.setup.step1.workAreas.placeholder")}
              filterOption={false}
              onSearch={handleLocationSearch}
              notFoundContent={
                locationSearchLoading ? <Spin size="small" /> : null
              }
              options={locationOptions}
              onDropdownVisibleChange={(open) => {
                if (open && locationOptions.length === 0) {
                  void runLocationSearch("");
                }
              }}
            />
          </Form.Item>

          <div className={styles.fieldGrid3}>
              <Form.Item
                className={styles.stitchField}
                name="date_of_birth"
                label={
                  <span className={styles.labelUpper}>
                    {t("worker.setup.step1.dateOfBirth.label")}
                  </span>
                }
              >
                <DatePicker
                  className={styles.inputFull}
                  format="DD/MM/YYYY"
                  size="middle"
                />
              </Form.Item>
              <Form.Item
                className={styles.stitchField}
                name="gender"
                label={
                  <span className={styles.labelUpper}>
                    {t("worker.setup.step1.gender.label")}
                  </span>
                }
                rules={[
                  {
                    required: true,
                    message: t("worker.setup.step1.gender.required"),
                  },
                ]}
              >
                <Select size="middle" className={styles.inputFull}>
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
              <Form.Item
                className={styles.stitchField}
                name="height_cm"
                label={
                  <span className={styles.labelUpper}>
                    {t("worker.setup.step1.heightWeight.height")}
                  </span>
                }
              >
                <InputNumber
                  className={styles.inputFull}
                  placeholder={t("worker.setup.step1.heightWeight.height")}
                  min={0}
                  max={300}
                  size="middle"
                  controls={false}
                />
              </Form.Item>
              <Form.Item
                className={styles.stitchField}
                name="weight_kg"
                label={
                  <span className={styles.labelUpper}>
                    {t("worker.setup.step1.heightWeight.weight")}
                  </span>
                }
              >
                <InputNumber
                  className={styles.inputFull}
                  placeholder={t("worker.setup.step1.heightWeight.weight")}
                  min={0}
                  max={500}
                  size="middle"
                  controls={false}
                />
              </Form.Item>
              <Form.Item
                className={styles.stitchField}
                name="experience"
                label={
                  <span className={styles.labelUpper}>
                    {t("worker.setup.step1.experience.label")}
                  </span>
                }
              >
                <Select
                  placeholder={t("worker.setup.step1.experience.placeholder")}
                  size="middle"
                  allowClear
                  className={styles.inputFull}
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
                className={styles.stitchField}
                name="star_sign"
                label={
                  <span className={styles.labelUpper}>
                    {t("worker.setup.step1.starSign.label")}
                  </span>
                }
              >
                <Select
                  placeholder={t("worker.setup.step1.starSign.placeholder")}
                  size="middle"
                  allowClear
                  className={styles.inputFull}
                >
                  {STAR_SIGNS.map((sign) => (
                    <Select.Option key={sign.value} value={sign.value}>
                      {t(`worker.setup.step1.starSign.${sign.value}`)}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
          </div>

          <div className={styles.fieldGrid2}>
              <Form.Item
                className={styles.stitchField}
                name="title"
                label={
                  <span className={styles.labelUpper}>
                    {t("worker.setup.step1.professionalTitle.label")}
                  </span>
                }
              >
                <Input
                  placeholder={t(
                    "worker.setup.step1.professionalTitle.placeholder"
                  )}
                  size="middle"
                  maxLength={100}
                />
              </Form.Item>
              <Form.Item
                className={styles.stitchField}
                name="lifestyle"
                label={
                  <span className={styles.labelUpper}>
                    {t("worker.setup.step1.lifestyle.label")}
                  </span>
                }
              >
                <Input
                  placeholder={t("worker.setup.step1.lifestyle.placeholder")}
                  size="middle"
                />
              </Form.Item>
          </div>

          <Form.Item
            className={styles.stitchField}
            name="quote"
            label={
              <span className={styles.labelUpper}>
                {t("worker.setup.step1.quote.label")}
              </span>
            }
          >
            <Input
              placeholder={t("worker.setup.step1.quote.placeholder")}
              size="middle"
            />
          </Form.Item>

          <div className={styles.hobbiesBlock}>
            <Text className={styles.labelUpper}>
              {t("worker.setup.step1.hobbies.label")}
            </Text>
            <div className={styles.hobbiesShell}>
              <div className={styles.hobbiesInner}>
                {hobbies.map((hobby) => (
                  <Tag
                    key={hobby}
                    closable
                    onClose={() => handleRemoveHobby(hobby)}
                    className={styles.tagItem}
                  >
                    {hobby}
                  </Tag>
                ))}
                <Input
                  bordered={false}
                  value={hobbyInput}
                  onChange={(e) => setHobbyInput(e.target.value)}
                  onPressEnter={handleAddHobby}
                  placeholder={t("worker.setup.step1.hobbies.placeholder")}
                  className={styles.hobbyInputInline}
                />
                <Button
                  type="default"
                  icon={<PlusOutlined />}
                  onClick={handleAddHobby}
                  className={styles.hobbyAddBtn}
                  aria-label={t("worker.setup.step1.hobbies.add")}
                />
              </div>
            </div>
          </div>

          <Form.Item
            className={styles.stitchField}
            name="introduction"
            label={
              <span className={styles.labelUpper}>
                {t("worker.setup.step1.introduction.label")}
              </span>
            }
          >
            <TextArea
              rows={5}
              placeholder={t("worker.setup.step1.introduction.placeholder")}
              className={styles.introTextarea}
            />
          </Form.Item>
          </div>
        </section>

        <section className={styles.stitchSection}>
          <div className={styles.sectionHeaderRow}>
            <div className={styles.sectionHeader}>
              <PictureOutlined className={styles.sectionIcon} aria-hidden />
              <Title level={5} className={styles.sectionTitle}>
                {t("worker.setup.monolith.sectionGallery")}
              </Title>
            </div>
            <Text type="secondary" className={styles.galleryHint}>
              {t("worker.setup.step1.gallery.maxImages")}
            </Text>
          </div>
          <div className={styles.sectionBody}>
          <Form.Item label={null}>
            <div className={styles.galleryUploadWrap}>
              <ImgCrop
                aspect={5 / 4}
                quality={0.9}
                fillColor="transparent"
                zoom
                rotate
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
                      <div className={styles.uploadAddText}>
                        {t("worker.setup.step1.gallery.upload")}
                      </div>
                    </div>
                  )}
                </Upload>
              </ImgCrop>
            </div>
          </Form.Item>
          </div>
        </section>
      </Form>
    </div>
  );
});
