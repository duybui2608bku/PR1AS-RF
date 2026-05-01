"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Row,
  Col,
  Rate,
  Tag,
  Typography,
  Space,
  Button,
  Card,
  Tooltip,
  message,
} from "antd";
import {
  TrophyFilled,
  MessageOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  EditOutlined,
  ArrowsAltOutlined,
  DashboardOutlined,
  StarOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useApiQueryData } from "@/lib/hooks/use-api";
import { type WorkerDetailResponse } from "@/lib/api/worker.api";
import { QueryState } from "@/lib/components/query-state";
import { ImageGallerySkeleton } from "@/lib/components/skeletons";
import {
  getGenderIcon,
  getGenderLabelKey,
  getExperienceLabelKey,
  randomColorTag,
  calculateAge,
} from "@/lib/utils/worker.utils";
import { WorkerReviews } from "../components/WorkerReviews";
import { WorkerCalendar } from "../components/WorkerCalendar";
import { WorkerServices } from "../components/WorkerServices";
import { BookingModal } from "../components/BookingModal";
import { WorkerMessageModal } from "../components/WorkerMessageModal";
import { AppRoute, buildChatRoute } from "@/lib/constants/routes";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useStandardizedMutation } from "@/lib/hooks/use-standardized-mutation";
import { useServicesMap } from "@/lib/hooks/use-services-map";
import { chatApi } from "@/lib/api/chat.api";
import { ChatErrorCode } from "@/lib/constants/error-codes";
import type { Dayjs } from "dayjs";
import styles from "./worker-detail.module.scss";

const { Title, Text, Paragraph } = Typography;

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workerId = params.id as string;
  const { t } = useI18n();
  const { user: currentUser } = useAuthStore();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullIntroduction, setShowFullIntroduction] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [firstMessageContent, setFirstMessageContent] = useState("");

  const {
    data: workerData,
    isLoading,
    isError,
    error,
  } = useApiQueryData<WorkerDetailResponse>(
    ["worker", workerId],
    workerId ? `/workers/${workerId}` : "",
    {
      enabled: !!workerId,
    }
  );

  const workerServices = useMemo(
    () => workerData?.services || [],
    [workerData?.services]
  );
  const isLoadingServices = isLoading;

  const selectedWorkerService = useMemo(() => {
    if (selectedServices.length === 0) return null;
    return workerServices.find((ws) => ws.service_id === selectedServices[0]);
  }, [selectedServices, workerServices]);

  const isViewingOwnProfile = useMemo(() => {
    return currentUser?.id === workerData?.user?.id;
  }, [currentUser?.id, workerData?.user?.id]);
  const isStandardPlan = currentUser?.pricing_plan_code === "standard";
  const chatBlockedMessage = t("chat.bookingConfirmationRequired");

  const { serviceMap, isLoading: isLoadingAllServices } = useServicesMap();

  const handleServiceToggle = useCallback((serviceId: string): void => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? [] : [serviceId]
    );
  }, []);

  const sendFirstMessageMutation = useStandardizedMutation(
    (content: string) => {
      if (!workerData?.user?.id) {
        throw new Error(ChatErrorCode.CONVERSATION_NOT_FOUND);
      }
      return chatApi.sendMessage({
        receiver_id: workerData.user.id,
        content,
        type: "text",
      });
    },
    {
      onSuccess: () => {
        setFirstMessageContent("");
        setMessageModalOpen(false);
        if (workerData?.user?.id) {
          router.push(buildChatRoute(workerData.user.id));
        }
      },
    }
  );

  const handleMessageClick = useCallback((): void => {
    if (isStandardPlan) {
      return;
    }

    if (workerData?.user?.id) {
      setMessageModalOpen(true);
    }
  }, [isStandardPlan, workerData?.user?.id]);

  const handleCloseMessageModal = useCallback((): void => {
    setMessageModalOpen(false);
    setFirstMessageContent("");
  }, []);

  const handleSendFirstMessage = useCallback((): void => {
    const content = firstMessageContent.trim();
    if (!content || !workerData?.user?.id) {
      return;
    }
    sendFirstMessageMutation.mutate(content);
  }, [firstMessageContent, workerData?.user?.id, sendFirstMessageMutation]);

  const handleHireClick = useCallback((): void => {
    if (selectedServices.length === 0) {
      message.warning(t("booking.selectService"));
      return;
    }

    setBookingModalOpen(true);
  }, [selectedServices.length, t]);

  const handleBookingSuccess = useCallback((): void => {
    setSelectedServices([]);
    setBookingModalOpen(false);
  }, []);

  const handleCloseBookingModal = useCallback((): void => {
    setBookingModalOpen(false);
  }, []);

  const handleToggleIntroduction = useCallback((): void => {
    setShowFullIntroduction((prev) => !prev);
  }, []);

  const handleSelectImage = useCallback((index: number): void => {
    setSelectedImageIndex(index);
  }, []);

  const workerContent = useMemo(() => {
    if (!workerData) return null;
    const { user, worker_profile } = workerData;
    const allImages = worker_profile.gallery_urls || [];
    const mainImage = allImages[selectedImageIndex] || allImages[0] || "";
    const introductionLines = worker_profile.introduction
      ? worker_profile.introduction.split("\n")
      : [];
    const shouldShowMore =
      introductionLines.length > 3 ||
      (worker_profile.introduction?.length ?? 0) > 200;
    const displayIntroduction = showFullIntroduction
      ? worker_profile.introduction
      : introductionLines.slice(0, 3).join("\n");

    const age = calculateAge(worker_profile.date_of_birth);
    const infoCards = [
      {
        title: t("worker.detail.info.age"),
        value:
          age !== null
            ? `${age} ${t("worker.detail.info.years")}`
            : t("worker.detail.info.na"),
        icon: <UserOutlined />,
      },
      {
        title: t("worker.detail.info.height"),
        value: worker_profile.height_cm
          ? `${worker_profile.height_cm} cm`
          : t("worker.detail.info.na"),
        icon: <ArrowsAltOutlined />,
      },
      {
        title: t("worker.detail.info.weight"),
        value: worker_profile.weight_kg
          ? `${worker_profile.weight_kg} kg`
          : t("worker.detail.info.na"),
        icon: <DashboardOutlined />,
      },
      {
        title: t("worker.detail.info.zodiac"),
        value: worker_profile.star_sign || t("worker.detail.info.na"),
        icon: <StarOutlined />,
      },
    ];

    return (
      <div className={styles.workerDetailPage}>
        <div className={styles.container}>
          <Row gutter={[32, 32]} className={styles.section}>
            <Col xs={24} lg={12}>
              {!mainImage ? (
                <ImageGallerySkeleton />
              ) : (
                <div className={styles.imageGallery}>
                  {mainImage ? (
                    <div className={styles.mainImageContainer}>
                      <Image
                        src={mainImage}
                        alt={user.full_name || "Worker"}
                        fill
                        className={styles.mainImage}
                        priority
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                    </div>
                  ) : null}

                  {allImages.length > 1 ? (
                    <div className={styles.imageSlider}>
                      {allImages.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => handleSelectImage(index)}
                          className={`${styles.thumbnailButton} ${
                            selectedImageIndex === index
                              ? styles.active
                              : ""
                          }`}
                        >
                          <Image
                            src={image}
                            alt={`Gallery ${index + 1}`}
                            fill
                            className={styles.thumbnailImage}
                            sizes="120px"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </Col>

            <Col xs={24} lg={12}>
              <div className={styles.userInfo}>
                <div className={styles.nameRow}>
                  <Title level={2} className={styles.nameTitle}>
                    {user.full_name || t("worker.detail.noName")}
                    {worker_profile.title ? (
                      <span className={styles.titleText}>
                        - {worker_profile.title}
                      </span>
                    ) : null}
                  </Title>
                  {isViewingOwnProfile ? (
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => router.push(AppRoute.WORKER_PROFILE_EDIT)}
                    >
                      {t("profile.editProfile")}
                    </Button>
                  ) : null}
                </div>

                <div className={styles.ratingRow}>
                  <Space size="middle" align="center">
                    <Space size={8} className={styles.ratingGroup}>
                      <Rate
                        disabled
                        value={workerData.review_stats?.average_rating || 0}
                        allowHalf
                        className={styles.rateStar}
                      />
                    </Space>
                    <Text className={styles.commentText}>
                      ({workerData.review_stats?.total_reviews || 0}{" "}
                      {t("worker.detail.rating.reviews")})
                    </Text>
                  </Space>
                </div>

                <div className={styles.infoRow}>
                  <Space size="large" wrap>
                    <Space size={8} className={styles.infoItem}>
                      <span className={styles.infoIcon}>
                        {getGenderIcon(worker_profile.gender)}
                      </span>
                      <Text className={styles.infoText}>
                        {t(getGenderLabelKey(worker_profile.gender))}
                      </Text>
                    </Space>
                    <Space size={8} className={styles.infoItem}>
                      <TrophyFilled className={styles.infoIcon} />
                      <Text className={styles.infoText}>
                        {t(
                          getExperienceLabelKey(
                            worker_profile.experience
                          )
                        )}
                      </Text>
                    </Space>
                  </Space>
                </div>

                {worker_profile.hobbies && worker_profile.hobbies.length > 0 ? (
                  <div className={styles.tagsRow}>
                    {worker_profile.hobbies.map((hobby, index) => (
                      <Tag
                        key={index}
                        variant="solid"
                        className={`${styles.tag} ${styles.tagPadding}`}
                        color={randomColorTag()}
                      >
                        {hobby}
                      </Tag>
                    ))}
                  </div>
                ) : null}

                {worker_profile.introduction ? (
                  <div className={styles.introRow}>
                    <Paragraph
                      className={`${styles.introText} ${showFullIntroduction ? styles.introTextFull : styles.introTextClamped}`}
                    >
                      {displayIntroduction}
                    </Paragraph>
                    {shouldShowMore ? (
                      <Button
                        type="link"
                        onClick={handleToggleIntroduction}
                        className={styles.showMoreButton}
                      >
                        {showFullIntroduction
                          ? t("worker.detail.introduction.showLess")
                          : t("worker.detail.introduction.showMore")}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Col>
          </Row>
          <Row gutter={[32, 32]} className={styles.section}>
            <Col xs={24} lg={14}>
              <Row gutter={[16, 16]} className={styles.infoCardsRow}>
                {infoCards.map((card, index) => (
                  <Col xs={12} sm={6} key={index}>
                    <Card className={styles.infoCard} hoverable>
                      <div className={styles.infoCardContent}>
                        <div className={styles.infoCardIcon}>
                          {card.icon}
                        </div>
                        <div className={styles.infoCardText}>
                          <div className={styles.infoCardValue}>
                            {card.value}
                          </div>
                          <div className={styles.infoCardTitle}>
                            {card.title}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
              <Row gutter={[16, 16]} className={styles.infoCardsRow}>
                {worker_profile.lifestyle ? (
                  <Col xs={24} sm={12}>
                    <Card
                      className={styles.contentCard}
                      title={t("worker.detail.lifestyle")}
                    >
                      <Paragraph className={styles.contentText}>
                        {worker_profile.lifestyle}
                      </Paragraph>
                    </Card>
                  </Col>
                ) : null}
                {worker_profile.quote ? (
                  <Col xs={24} sm={12}>
                    <Card
                      className={styles.contentCard}
                      title={t("worker.detail.quote")}
                    >
                      <Paragraph className={styles.quoteText}>
                        &quot;{worker_profile.quote}&quot;
                      </Paragraph>
                    </Card>
                  </Col>
                ) : null}
              </Row>
              <WorkerReviews reviews={workerData.reviews} />
            </Col>
            <Col xs={24} lg={10}>
              <WorkerCalendar
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
              <WorkerServices
                services={workerServices}
                selectedServices={selectedServices}
                onServiceToggle={handleServiceToggle}
                serviceMap={serviceMap}
                isLoading={isLoadingServices || isLoadingAllServices}
                disabled={isViewingOwnProfile}
              />
              {!isViewingOwnProfile ? (
                <>
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<ShoppingCartOutlined />}
                    className={`${styles.hireButton} ${styles.hireButtonMargin}`}
                    onClick={handleHireClick}
                    disabled={selectedServices.length === 0}
                  >
                    {t("worker.detail.hireNow")}
                  </Button>
                  <Tooltip title={isStandardPlan ? chatBlockedMessage : undefined}>
                    <span>
                      <Button
                        size="large"
                        block
                        icon={<MessageOutlined />}
                        className={styles.messageButton}
                        onClick={handleMessageClick}
                        disabled={isStandardPlan}
                      >
                        {t("worker.detail.message")}
                        {isStandardPlan ? (
                          <InfoCircleOutlined style={{ marginLeft: 8 }} />
                        ) : null}
                      </Button>
                    </span>
                  </Tooltip>
                </>
              ) : null}
            </Col>
          </Row>
        </div>
      </div>
    );
  }, [
    workerData,
    selectedImageIndex,
    showFullIntroduction,
    isViewingOwnProfile,
    isStandardPlan,
    selectedDate,
    selectedServices,
    workerServices,
    serviceMap,
    isLoadingServices,
    isLoadingAllServices,
    t,
    router,
    handleSelectImage,
    handleToggleIntroduction,
    handleHireClick,
    handleMessageClick,
    handleServiceToggle,
  ]);

  return (
    <>
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        data={workerData}
        loadingText={t("worker.detail.loading")}
        errorTitle={t("worker.detail.error.title")}
        errorMessage={
          error?.response?.data?.message || t("worker.detail.error.message")
        }
        className={styles.queryStateContainer}
      >
        {workerContent}
      </QueryState>

      {workerData && selectedWorkerService ? (
        <BookingModal
          open={bookingModalOpen}
          onClose={handleCloseBookingModal}
          workerId={workerData.user.id}
          workerServiceId={selectedWorkerService._id}
          serviceId={selectedWorkerService.service_id}
          serviceCode={selectedWorkerService.service_code}
          pricing={selectedWorkerService.pricing}
          onSuccess={handleBookingSuccess}
        />
      ) : null}

      {workerData ? (
        <WorkerMessageModal
          open={messageModalOpen}
          content={firstMessageContent}
          isSubmitting={sendFirstMessageMutation.isPending}
          onChangeContent={setFirstMessageContent}
          onCancel={handleCloseMessageModal}
          onSubmit={handleSendFirstMessage}
          t={t}
        />
      ) : null}
    </>
  );
}
