"use client";

import React, { useState, useMemo } from "react";
import {
  Layout,
  Row,
  Col,
  Rate,
  Tag,
  Typography,
  Space,
  Button,
  Card,
  message,
} from "antd";
import {
  CalendarOutlined,
  TrophyFilled,
  MessageOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  ArrowsAltOutlined,
  DashboardOutlined,
  StarOutlined,
} from "@ant-design/icons";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useApiQueryData } from "@/lib/hooks/use-api";
import { type WorkerDetailResponse, servicesApi } from "@/lib/api/worker.api";
import type { Service } from "@/lib/types/worker";
import { QueryState } from "@/lib/components/query-state";
import { ImageGallerySkeleton } from "@/lib/components/skeletons";
import {
  getGenderIcon,
  getGenderLabelKey,
  getExperienceLabelKey,
  randomColorTag,
  calculateAge,
} from "@/lib/utils/worker.utils";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import { WorkerReviews } from "../components/WorkerReviews";
import { WorkerCalendar } from "../components/WorkerCalendar";
import { WorkerServices } from "../components/WorkerServices";
import { BookingModal } from "../components/BookingModal";
import { buildChatRoute } from "@/lib/constants/routes";
import { useAuthStore } from "@/lib/stores/auth.store";
import type { Dayjs } from "dayjs";
import styles from "./worker-detail.module.scss";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

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

  const workerServices = workerData?.services || [];
  const isLoadingServices = isLoading;

  const selectedWorkerService = useMemo(() => {
    if (selectedServices.length === 0) return null;
    return workerServices.find((ws) => ws.service_id === selectedServices[0]);
  }, [selectedServices, workerServices]);

  const isViewingOwnProfile = useMemo(() => {
    return currentUser?.id === workerData?.user?.id;
  }, [currentUser?.id, workerData?.user?.id]);

  const { data: allServicesResponse, isLoading: isLoadingAllServices } =
    useApiQueryData<{ services: Service[]; count: number }>(
      ["all-services"],
      "/services",
      {
        enabled: true,
      }
    );

  const serviceMap = React.useMemo(() => {
    const services = allServicesResponse?.services || [];
    if (!Array.isArray(services) || services.length === 0) {
      return new Map<string, Service>();
    }
    const map = new Map<string, Service>();
    services.forEach((service) => {
      map.set(service.code, service);
    });
    return map;
  }, [allServicesResponse]);

  const handleServiceToggle = (serviceId: string): void => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? [] : [serviceId]
    );
  };

  const handleMessageClick = (): void => {
    if (workerData?.user?.id) {
      router.push(buildChatRoute(workerData.user.id));
    }
  };

  const handleHireClick = (): void => {
    if (selectedServices.length === 0) {
      message.warning(t("booking.selectService"));
      return;
    }

    setBookingModalOpen(true);
  };

  const handleBookingSuccess = (): void => {
    setSelectedServices([]);
    setBookingModalOpen(false);
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <Header />

      <Content
        style={{ background: "#FFFFFF", maxWidth: "100%", overflowX: "hidden" }}
      >
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
          {workerData &&
            (() => {
              const { user, worker_profile } = workerData;
              const allImages = worker_profile.gallery_urls || [];
              const mainImage =
                allImages[selectedImageIndex] || allImages[0] || "";
              const introductionLines = worker_profile.introduction
                ? worker_profile.introduction.split("\n")
                : [];
              const shouldShowMore =
                introductionLines.length > 3 ||
                (worker_profile.introduction?.length ?? 0) > 200;
              const displayIntroduction = showFullIntroduction
                ? worker_profile.introduction
                : introductionLines.slice(0, 3).join("\n");

              return (
                <div className={styles.workerDetailPage}>
                  <div className={styles.container}>
                    <Row gutter={[32, 32]} className={styles.section}>
                      <Col xs={24} lg={12}>
                        {!mainImage ? (
                          <ImageGallerySkeleton />
                        ) : (
                          <div className={styles.imageGallery}>
                            {mainImage && (
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
                            )}

                            {allImages.length > 1 && (
                              <div className={styles.imageSlider}>
                                {allImages.map((image, index) => (
                                  <button
                                    key={index}
                                    onClick={() => setSelectedImageIndex(index)}
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
                            )}
                          </div>
                        )}
                      </Col>

                      <Col xs={24} lg={12}>
                        <div className={styles.userInfo}>
                          <div className={styles.nameRow}>
                            <Title level={2} className={styles.nameTitle}>
                              {user.full_name || t("worker.detail.noName")}
                              {worker_profile.title && (
                                <span className={styles.titleText}>
                                  - {worker_profile.title}
                                </span>
                              )}
                            </Title>
                          </div>

                          <div className={styles.ratingRow}>
                            <Space size="middle" align="center">
                              <Space size={8} className={styles.ratingGroup}>
                                <Rate
                                  disabled
                                  value={workerData.review_stats?.average_rating || 0}
                                  allowHalf
                                  style={{ color: "#fbbf24" }}
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

                          {worker_profile.hobbies &&
                            worker_profile.hobbies.length > 0 && (
                              <div className={styles.tagsRow}>
                                {worker_profile.hobbies.map((hobby, index) => (
                                  <Tag
                                    style={{
                                      padding: "4px 12px",
                                    }}
                                    key={index}
                                    variant="solid"
                                    className={styles.tag}
                                    color={randomColorTag()}
                                  >
                                    {hobby}
                                  </Tag>
                                ))}
                              </div>
                            )}

                          {worker_profile.introduction && (
                            <div className={styles.introRow}>
                              <Paragraph
                                className={styles.introText}
                                style={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: showFullIntroduction
                                    ? "unset"
                                    : 3,
                                  WebkitBoxOrient: "vertical",
                                  overflow: showFullIntroduction
                                    ? "visible"
                                    : "hidden",
                                }}
                              >
                                {displayIntroduction}
                              </Paragraph>
                              {shouldShowMore && (
                                <Button
                                  type="link"
                                  onClick={() =>
                                    setShowFullIntroduction(
                                      !showFullIntroduction
                                    )
                                  }
                                  className={styles.showMoreButton}
                                >
                                  {showFullIntroduction
                                    ? t("worker.detail.introduction.showLess")
                                    : t("worker.detail.introduction.showMore")}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </Col>
                    </Row>
                    <Row gutter={[32, 32]} className={styles.section}>
                      <Col xs={24} lg={14}>
                        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                          {(() => {
                            const age = calculateAge(
                              worker_profile.date_of_birth
                            );
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
                                value:
                                  worker_profile.star_sign ||
                                  t("worker.detail.info.na"),
                                icon: <StarOutlined />,
                              },
                            ];

                            return infoCards.map((card, index) => (
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
                            ));
                          })()}
                        </Row>
                        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                          {worker_profile.lifestyle && (
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
                          )}
                          {worker_profile.quote && (
                            <Col xs={24} sm={12}>
                              <Card
                                className={styles.contentCard}
                                title={t("worker.detail.quote")}
                              >
                                <Paragraph className={styles.quoteText}>
                                  "{worker_profile.quote}"
                                </Paragraph>
                              </Card>
                            </Col>
                          )}
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
                        {!isViewingOwnProfile && (
                          <>
                            <Button
                              type="primary"
                              size="large"
                              block
                              icon={<ShoppingCartOutlined />}
                              className={styles.hireButton}
                              style={{ marginBottom: 16 }}
                              onClick={handleHireClick}
                              disabled={selectedServices.length === 0}
                            >
                              {t("worker.detail.hireNow")}
                            </Button>
                            <Button
                              size="large"
                              block
                              icon={<MessageOutlined />}
                              className={styles.messageButton}
                              onClick={handleMessageClick}
                            >
                              {t("worker.detail.message")}
                            </Button>
                          </>
                        )}
                      </Col>
                    </Row>
                  </div>
                </div>
              );
            })()}
        </QueryState>
      </Content>

      {workerData && selectedWorkerService && (
        <BookingModal
          open={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          workerId={workerData.user.id}
          workerServiceId={selectedWorkerService._id}
          serviceId={selectedWorkerService.service_id}
          serviceCode={selectedWorkerService.service_code}
          pricing={selectedWorkerService.pricing}
          onSuccess={handleBookingSuccess}
        />
      )}

      <Footer />
    </Layout>
  );
}
