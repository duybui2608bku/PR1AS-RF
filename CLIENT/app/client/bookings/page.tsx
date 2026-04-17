"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Grid,
  Space,
  Typography,
  message,
} from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import type { Dayjs } from "dayjs";
import { bookingApi } from "@/lib/api/booking.api";
import { reviewApi } from "@/lib/api/review.api";
import { chatApi } from "@/lib/api/chat.api";
import { useStandardizedMutation } from "@/lib/hooks/use-standardized-mutation";
import type { BookingQuery, Booking } from "@/lib/types/booking";
import { BookingStatus, BookingPaymentStatus } from "@/lib/types/booking";
import { ReviewType } from "@/lib/types/review";
import { useCurrencyStore } from "@/lib/stores/currency.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { AuthGuard } from "@/lib/components/auth-guard";
import {
  PAGINATION_DEFAULTS,
  PAGE_SIZE_OPTIONS,
  DATE_FORMAT_ISO,
} from "@/app/constants/constants";
import { createBookingColumns } from "@/app/client/bookings/constants/client-booking-constants";
import { useI18n } from "@/lib/hooks/use-i18n";
import { CancelBookingModal } from "@/app/client/bookings/components/CancelBookingModal";
import { ReviewModal } from "@/app/client/bookings/components/ReviewModal";
import { BookingListMobile } from "@/app/client/bookings/components/BookingListMobile";
import { BookingFilters } from "@/app/components/BookingFilters";
import type { CancellationReason } from "@/app/client/bookings/constants/client-booking-constants";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { useServicesMap } from "@/lib/hooks/use-services-map";
import {
  BOOKING_QUERY_KEYS,
  BookingPageConfig,
  FILTER_VALUE_ALL,
} from "@/app/bookings/constants/bookings-page.constants";
import styles from "./page.module.scss";

const { Title } = Typography;

function BookingsContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const { locale } = useI18n();
  const screens = Grid.useBreakpoint();
  const queryClient = useQueryClient();
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const { page, limit, handleTableChange, resetPage } = usePagination();
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

  const { serviceMap } = useServicesMap();

  const resetCancelModalState = (): void => {
    setCancelModalOpen(false);
    setSelectedBookingId(null);
  };

  const resetReviewModalState = (): void => {
    setReviewModalOpen(false);
    setSelectedBookingForReview(null);
  };

  const invalidateClientBookingQueries = () => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: [BOOKING_QUERY_KEYS.CLIENT_BOOKINGS],
      }),
      queryClient.invalidateQueries({
        queryKey: [BOOKING_QUERY_KEYS.ALL_SERVICES],
      }),
    ]);
  };

  const query: BookingQuery = {
    page,
    limit,
    status: statusFilter,
    payment_status: paymentStatusFilter,
    start_date: dateRange?.[0]?.format(DATE_FORMAT_ISO),
    end_date: dateRange?.[1]?.format(DATE_FORMAT_ISO),
  };

  const { data: bookingsData, isLoading, error: bookingsError } = useQuery({
    queryKey: [BOOKING_QUERY_KEYS.CLIENT_BOOKINGS, query],
    queryFn: () => bookingApi.getMyBookings(query),
    retry: false,
  });

  const cancelBookingMutation = useStandardizedMutation(
    (params: {
      bookingId: string;
      reason: string;
      notes: string;
    }) =>
      bookingApi.cancelBooking(
        params.bookingId,
        params.reason,
        params.notes
      ),
    {
      onSuccess: () => {
        message.success(t("booking.worker.actions.cancelSuccess"));
        void invalidateClientBookingQueries();
        resetCancelModalState();
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
        void invalidateClientBookingQueries();
        resetReviewModalState();
      },
    }
  );

  const handleStatusFilterChange = (
    value: BookingStatus | typeof FILTER_VALUE_ALL
  ): void => {
    setStatusFilter(value === FILTER_VALUE_ALL ? undefined : value);
    resetPage();
  };

  const handlePaymentStatusFilterChange = (
    value: BookingPaymentStatus | typeof FILTER_VALUE_ALL
  ): void => {
    setPaymentStatusFilter(value === FILTER_VALUE_ALL ? undefined : value);
    resetPage();
  };

  const handleDateRangeChange = (
    dates: [Dayjs | null, Dayjs | null] | null
  ): void => {
    setDateRange(dates);
    resetPage();
  };

  const handleResetFilters = (): void => {
    setStatusFilter(undefined);
    setPaymentStatusFilter(undefined);
    setDateRange(null);
    resetPage();
  };

  const handleOpenCancelModal = (bookingId: string): void => {
    setSelectedBookingId(bookingId);
    setCancelModalOpen(true);
  };

  const handleCloseCancelModal = (): void => {
    resetCancelModalState();
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
      reason: values.reason,
      notes: values.notes || "",
    });
  };

  const handleRefreshBookings = async (): Promise<void> => {
    await message.loading(
      t("booking.worker.actions.refreshing"),
      BookingPageConfig.REFRESH_MESSAGE_DURATION_SECONDS
    );
    await invalidateClientBookingQueries();
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
    resetReviewModalState();
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

  const createComplaintMutation = useStandardizedMutation(
    (bookingId: string) => chatApi.createComplaintConversation(bookingId),
    {
      onSuccess: (data) => {
        router.push(`/chat?group=${data.conversation._id}`);
      },
      onError: () => {
        message.error(t("booking.client.actions.complainError"));
      },
    }
  );

  const handleComplainBooking = (bookingId: string): void => {
    createComplaintMutation.mutate(bookingId);
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

  useEffect(() => {
    if (bookingsError) {
      handleError(bookingsError);
    }
  }, [bookingsError, handleError]);

  return (
    <div className={styles.container}>
      <Title level={2} className={styles.pageTitle}>
        <CalendarOutlined className={styles.titleIcon} />
        {t("booking.list.title")}
      </Title>

      <Card>
        <BookingFilters
          statusFilter={statusFilter}
          paymentStatusFilter={paymentStatusFilter}
          dateRange={dateRange}
          isLoading={isLoading}
          onStatusChange={handleStatusFilterChange}
          onPaymentStatusChange={handlePaymentStatusFilterChange}
          onDateRangeChange={handleDateRangeChange}
          onReset={handleResetFilters}
          onRefresh={handleRefreshBookings}
          className={styles.filtersRow}
        />

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
    </div>
  );
}

export default function BookingsPage() {
  return (
    <AuthGuard>
      <BookingsContent />
    </AuthGuard>
  );
}
