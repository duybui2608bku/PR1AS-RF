"use client";

import { useState, useMemo } from "react";
import {
  Layout,
  Card,
  Table,
  Grid,
  Space,
  Typography,
  Select,
  Row,
  Col,
  DatePicker,
  message,
  Button,
} from "antd";
import { CalendarOutlined, ReloadOutlined, ClearOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Dayjs } from "dayjs";
import { bookingApi } from "@/lib/api/booking.api";
import { reviewApi } from "@/lib/api/review.api";
import { useStandardizedMutation } from "@/lib/hooks/use-standardized-mutation";
import type { BookingQuery, Booking } from "@/lib/types/booking";
import { BookingStatus, BookingPaymentStatus } from "@/lib/types/booking";
import { ReviewType } from "@/lib/types/review";
import { useCurrencyStore } from "@/lib/stores/currency.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { AuthGuard } from "@/lib/components/auth-guard";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import {
  PAGINATION_DEFAULTS,
  PAGE_SIZE_OPTIONS,
} from "@/app/constants/constants";
import { createBookingColumns } from "@/app/client/bookings/constants/client-booking-constants";
import { useApiQueryData } from "@/lib/hooks/use-api";
import type { Service } from "@/lib/types/worker";
import { useI18n } from "@/lib/hooks/use-i18n";
import { CancelledBy } from "@/app/client/bookings/constants/client-booking-constants";
import { CancelBookingModal } from "@/app/client/bookings/components/CancelBookingModal";
import { ReviewModal } from "@/app/client/bookings/components/ReviewModal";
import { BookingListMobile } from "@/app/client/bookings/components/BookingListMobile";
import type { CancellationReason } from "@/app/client/bookings/constants/client-booking-constants";
import { Spacing } from "@/lib/constants/ui.constants";
import styles from "./page.module.scss";

const { Title } = Typography;
const { Content } = Layout;
const { Option } = Select;
const { RangePicker } = DatePicker;

function BookingsContent() {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const screens = Grid.useBreakpoint();
  const queryClient = useQueryClient();
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);
  const [limit, setLimit] = useState<number>(PAGINATION_DEFAULTS.LIMIT);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | undefined>(
    undefined
  );
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<
    BookingPaymentStatus | undefined
  >(undefined);
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const { user } = useAuthStore();
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  );
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [selectedBookingForReview, setSelectedBookingForReview] =
    useState<Booking | null>(null);

  const { data: allServicesResponse } = useApiQueryData<{
    services: Service[];
    count: number;
  }>(["all-services"], "/services", {
    enabled: true,
  });

  const serviceMap = useMemo(() => {
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

  const query: BookingQuery = {
    page,
    limit,
    status: statusFilter,
    payment_status: paymentStatusFilter,
    start_date: dateRange?.[0]?.format("YYYY-MM-DD"),
    end_date: dateRange?.[1]?.format("YYYY-MM-DD"),
  };

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ["client-bookings", query],
    queryFn: () => bookingApi.getMyBookings(query),
    retry: false,
  });

  const cancelBookingMutation = useStandardizedMutation(
    (params: {
      bookingId: string;
      cancelledBy: string;
      reason: string;
      notes: string;
    }) =>
      bookingApi.cancelBooking(
        params.bookingId,
        params.cancelledBy,
        params.reason,
        params.notes
      ),
    {
      onSuccess: () => {
        message.success(t("booking.worker.actions.cancelSuccess"));
        queryClient.invalidateQueries({ queryKey: ["client-bookings"] });
        handleCloseCancelModal();
      },
    }
  );

  const createReviewMutation = useStandardizedMutation(
    (data: {
      booking_id: string;
      worker_id: string;
      client_id: string;
      review_type: ReviewType;
      rating: number;
      rating_details: {
        professionalism: number;
        punctuality: number;
        communication: number;
        service_quality: number;
      };
      comment: string;
    }) => reviewApi.createReview(data),
    {
      onSuccess: () => {
        message.success(t("booking.review.success"));
        queryClient.invalidateQueries({ queryKey: ["client-bookings"] });
        handleCloseReviewModal();
      },
    }
  );

  const handleTableChange = (newPage: number, newPageSize: number): void => {
    setPage(newPage);
    setLimit(newPageSize);
  };

  const handleStatusFilterChange = (value: BookingStatus | "all"): void => {
    setStatusFilter(value === "all" ? undefined : value);
    setPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handlePaymentStatusFilterChange = (
    value: BookingPaymentStatus | "all"
  ): void => {
    setPaymentStatusFilter(value === "all" ? undefined : value);
    setPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleDateRangeChange = (
    dates: [Dayjs | null, Dayjs | null] | null
  ): void => {
    setDateRange(dates);
    setPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleResetFilters = (): void => {
    setStatusFilter(undefined);
    setPaymentStatusFilter(undefined);
    setDateRange(null);
    setPage(PAGINATION_DEFAULTS.PAGE);
  };

  const handleOpenCancelModal = (bookingId: string): void => {
    setSelectedBookingId(bookingId);
    setCancelModalOpen(true);
  };

  const handleCloseCancelModal = (): void => {
    setCancelModalOpen(false);
    setSelectedBookingId(null);
  };

  const handleSubmitCancelBooking = async (values: {
    reason: CancellationReason;
    notes?: string;
  }): Promise<void> => {
    if (!selectedBookingId) {
      return;
    }
    cancelBookingMutation.mutate({
      bookingId: selectedBookingId,
      cancelledBy: CancelledBy.CLIENT,
      reason: values.reason,
      notes: values.notes || "",
    });
  };

  const handleRefreshBookings = async (): Promise<void> => {
    await message.loading(t("booking.worker.actions.refreshing"), 3);
    queryClient.invalidateQueries({ queryKey: ["client-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["all-services"] });
    message.success(t("booking.worker.actions.refreshSuccess"));
  };

  const handleOpenReviewModal = (bookingId: string): void => {
    const booking = bookingsData?.data.find(
      (b) => (b as { id?: string }).id === bookingId || b._id === bookingId
    );
    if (booking) {
      setSelectedBookingForReview(booking);
      setReviewModalOpen(true);
    }
  };

  const handleCloseReviewModal = (): void => {
    setReviewModalOpen(false);
    setSelectedBookingForReview(null);
  };

  const handleSubmitReview = async (values: {
    rating: number;
    rating_details: {
      professionalism: number;
      punctuality: number;
      communication: number;
      service_quality: number;
    };
    comment: string;
  }): Promise<void> => {
    if (!selectedBookingForReview || !user) {
      return;
    }

    const bookingId =
      (selectedBookingForReview as { id?: string }).id ||
      selectedBookingForReview._id;

    const workerId =
      typeof selectedBookingForReview.worker_id === "object" &&
      selectedBookingForReview.worker_id !== null &&
      "_id" in selectedBookingForReview.worker_id
        ? (selectedBookingForReview.worker_id as { _id: string })._id
        : (selectedBookingForReview.worker_id as string);

    createReviewMutation.mutate({
      booking_id: bookingId,
      worker_id: workerId,
      client_id: user.id,
      review_type: ReviewType.CLIENT_TO_WORKER,
      rating: values.rating,
      rating_details: values.rating_details,
      comment: values.comment,
    });
  };

  const handleComplainBooking = (bookingId: string): void => {
    message.info(t("booking.client.actions.complainComingSoon"));
  };

  const columns = createBookingColumns({
    t,
    formatCurrency,
    serviceMap,
    locale,
    onCancelBooking: handleOpenCancelModal,
    onReviewBooking: handleOpenReviewModal,
    onComplainBooking: handleComplainBooking,
  });

  return (
    <Layout className={styles.layout}>
      <Header />
      <Content className={styles.content}>
        <div className={styles.container}>
          <Title level={2} className={styles.pageTitle}>
            <CalendarOutlined className={styles.titleIcon} />
            {t("booking.list.title")}
          </Title>

          <Card>
            <Row gutter={[Spacing.LG, Spacing.LG]} className={styles.filtersRow}>
              <Col xs={24} sm={12} md={6}>
                <Space
                  direction="vertical"
                  size="small"
                  className={styles.filterSpace}
                >
                  <span>{t("booking.list.filters.status")}</span>
                  <Select
                    className={styles.selectFull}
                    value={statusFilter || "all"}
                    onChange={handleStatusFilterChange}
                    allowClear
                  >
                    <Option value="all">{t("booking.list.filters.all")}</Option>
                    <Option value={BookingStatus.PENDING}>
                      {t(`booking.status.${BookingStatus.PENDING}`)}
                    </Option>
                    <Option value={BookingStatus.CONFIRMED}>
                      {t(`booking.status.${BookingStatus.CONFIRMED}`)}
                    </Option>
                    <Option value={BookingStatus.IN_PROGRESS}>
                      {t(`booking.status.${BookingStatus.IN_PROGRESS}`)}
                    </Option>
                    <Option value={BookingStatus.COMPLETED}>
                      {t(`booking.status.${BookingStatus.COMPLETED}`)}
                    </Option>
                    <Option value={BookingStatus.CANCELLED}>
                      {t(`booking.status.${BookingStatus.CANCELLED}`)}
                    </Option>
                    <Option value={BookingStatus.REJECTED}>
                      {t(`booking.status.${BookingStatus.REJECTED}`)}
                    </Option>
                    <Option value={BookingStatus.DISPUTED}>
                      {t(`booking.status.${BookingStatus.DISPUTED}`)}
                    </Option>
                  </Select>
                </Space>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Space
                  orientation="vertical"
                  size="small"
                  className={styles.filterSpace}
                >
                  <span>{t("booking.list.filters.paymentStatus")}</span>
                  <Select
                    className={styles.selectFull}
                    value={paymentStatusFilter || "all"}
                    onChange={handlePaymentStatusFilterChange}
                    allowClear
                  >
                    <Option value="all">{t("booking.list.filters.all")}</Option>
                    <Option value={BookingPaymentStatus.PENDING}>
                      {t(
                        `booking.paymentStatus.${BookingPaymentStatus.PENDING}`
                      )}
                    </Option>
                    <Option value={BookingPaymentStatus.PAID}>
                      {t(`booking.paymentStatus.${BookingPaymentStatus.PAID}`)}
                    </Option>
                    <Option value={BookingPaymentStatus.PARTIALLY_REFUNDED}>
                      {t(
                        `booking.paymentStatus.${BookingPaymentStatus.PARTIALLY_REFUNDED}`
                      )}
                    </Option>
                    <Option value={BookingPaymentStatus.REFUNDED}>
                      {t(
                        `booking.paymentStatus.${BookingPaymentStatus.REFUNDED}`
                      )}
                    </Option>
                  </Select>
                </Space>
              </Col>
              <Col xs={24} sm={24} md={8}>
                <Space
                  orientation="vertical"
                  size="small"
                  style={{ width: "100%" }}
                >
                  <span>{t("booking.list.filters.dateRange")}</span>
                  <RangePicker
                    style={{ width: "100%" }}
                    value={dateRange}
                    onChange={handleDateRangeChange}
                    format="YYYY-MM-DD"
                  />
                </Space>
              </Col>
              <Col xs={24} sm={24} md={4}>
                <Space
                  orientation="vertical"
                  size="small"
                  className={styles.filterSpace}
                >
                  <span className={styles.placeholderLabel}>&nbsp;</span>
                  <Space>
                    <Button
                      icon={<ClearOutlined />}
                      onClick={handleResetFilters}
                    >
                      {t("common.reset")}
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleRefreshBookings}
                      loading={isLoading}
                    >
                      {t("common.refresh")}
                    </Button>
                  </Space>
                </Space>
              </Col>
            </Row>

            {screens.md ? (
              <Table<Booking>
                columns={columns}
                dataSource={bookingsData?.data || []}
                loading={isLoading}
                rowKey={(record) => (record as { id?: string }).id || record._id}
                pagination={{
                  current: page,
                  pageSize: limit,
                  total: bookingsData?.pagination?.total || 0,
                  showSizeChanger: true,
                  showTotal: (totalCount) =>
                    t("common.pagination.total", { total: totalCount }),
                  pageSizeOptions: PAGE_SIZE_OPTIONS,
                }}
                onChange={(pagination) => {
                  handleTableChange(
                    pagination.current || PAGINATION_DEFAULTS.PAGE,
                    pagination.pageSize || PAGINATION_DEFAULTS.LIMIT
                  );
                }}
                scroll={{ x: "max-content" }}
              />
            ) : (
              <BookingListMobile
                data={bookingsData?.data || []}
                loading={isLoading}
                serviceMap={serviceMap}
                formatCurrency={formatCurrency}
                locale={locale}
                t={t}
                currentPage={page}
                pageSize={limit}
                total={bookingsData?.pagination?.total || 0}
                onPageChange={handleTableChange}
                onCancelBooking={handleOpenCancelModal}
                onReviewBooking={handleOpenReviewModal}
                onComplainBooking={handleComplainBooking}
              />
            )}
          </Card>
        </div>
        <CancelBookingModal
          open={cancelModalOpen}
          onCancel={handleCloseCancelModal}
          onOk={handleSubmitCancelBooking}
          loading={cancelBookingMutation.isPending}
        />
        <ReviewModal
          open={reviewModalOpen}
          onCancel={handleCloseReviewModal}
          onOk={handleSubmitReview}
          loading={createReviewMutation.isPending}
        />
      </Content>
      <Footer />
    </Layout>
  );
}

export default function BookingsPage() {
  return (
    <AuthGuard>
      <BookingsContent />
    </AuthGuard>
  );
}
