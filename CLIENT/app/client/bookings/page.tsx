"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Table,
  Grid,
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
import type { BookingQuery, Booking, DisputeReason } from "@/lib/types/booking";
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
import { ComplaintModal } from "@/app/client/bookings/components/ComplaintModal";
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
  const [complaintModalOpen, setComplaintModalOpen] = useState<boolean>(false);
  const [selectedBookingIdForComplaint, setSelectedBookingIdForComplaint] =
    useState<string | null>(null);

  const { serviceMap } = useServicesMap();

  const resetCancelModalState = useCallback((): void => {
    setCancelModalOpen(false);
    setSelectedBookingId(null);
  }, []);

  const resetReviewModalState = useCallback((): void => {
    setReviewModalOpen(false);
    setSelectedBookingForReview(null);
  }, []);

  const resetComplaintModalState = useCallback((): void => {
    setComplaintModalOpen(false);
    setSelectedBookingIdForComplaint(null);
  }, []);

  const invalidateClientBookingQueries = useCallback(() => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: [BOOKING_QUERY_KEYS.CLIENT_BOOKINGS],
      }),
      queryClient.invalidateQueries({
        queryKey: [BOOKING_QUERY_KEYS.ALL_SERVICES],
      }),
    ]);
  }, [queryClient]);

  const query: BookingQuery = useMemo(() => ({
    page,
    limit,
    role: "client",
    status: statusFilter,
    payment_status: paymentStatusFilter,
    start_date: dateRange?.[0]?.format(DATE_FORMAT_ISO),
    end_date: dateRange?.[1]?.format(DATE_FORMAT_ISO),
  }), [page, limit, statusFilter, paymentStatusFilter, dateRange]);

  const { data: bookingsData, isLoading, error: bookingsError } = useQuery({
    queryKey: [BOOKING_QUERY_KEYS.CLIENT_BOOKINGS, query],
    queryFn: () => bookingApi.getMyBookings(query),
    retry: false,
  });

  const handleCancelSuccess = useCallback(() => {
    message.success(t("booking.worker.actions.cancelSuccess"));
    void invalidateClientBookingQueries();
    resetCancelModalState();
  }, [t, invalidateClientBookingQueries, resetCancelModalState]);

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
      onSuccess: handleCancelSuccess,
    }
  );

  const handleReviewSuccess = useCallback(() => {
    message.success(t("booking.review.success"));
    void invalidateClientBookingQueries();
    resetReviewModalState();
  }, [t, invalidateClientBookingQueries, resetReviewModalState]);

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
      onSuccess: handleReviewSuccess,
    }
  );

  const handleStatusFilterChange = useCallback((
    value: BookingStatus | typeof FILTER_VALUE_ALL
  ): void => {
    setStatusFilter(value === FILTER_VALUE_ALL ? undefined : value);
    resetPage();
  }, [resetPage]);

  const handlePaymentStatusFilterChange = useCallback((
    value: BookingPaymentStatus | typeof FILTER_VALUE_ALL
  ): void => {
    setPaymentStatusFilter(value === FILTER_VALUE_ALL ? undefined : value);
    resetPage();
  }, [resetPage]);

  const handleDateRangeChange = useCallback((
    dates: [Dayjs | null, Dayjs | null] | null
  ): void => {
    setDateRange(dates);
    resetPage();
  }, [resetPage]);

  const handleResetFilters = useCallback((): void => {
    setStatusFilter(undefined);
    setPaymentStatusFilter(undefined);
    setDateRange(null);
    resetPage();
  }, [resetPage]);

  const handleOpenCancelModal = useCallback((bookingId: string): void => {
    setSelectedBookingId(bookingId);
    setCancelModalOpen(true);
  }, []);

  const handleCloseCancelModal = useCallback((): void => {
    resetCancelModalState();
  }, [resetCancelModalState]);

  const handleSubmitCancelBooking = useCallback(async (values: {
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
  }, [selectedBookingId, cancelBookingMutation]);

  const handleRefreshBookings = useCallback(async (): Promise<void> => {
    await message.loading(
      t("booking.worker.actions.refreshing"),
      BookingPageConfig.REFRESH_MESSAGE_DURATION_SECONDS
    );
    await invalidateClientBookingQueries();
    message.success(t("booking.worker.actions.refreshSuccess"));
  }, [t, invalidateClientBookingQueries]);

  const handleOpenReviewModal = useCallback((bookingId: string): void => {
    const booking = bookingsData?.data.find(
      (b) => (b as { id?: string }).id === bookingId || b._id === bookingId
    );
    if (booking) {
      setSelectedBookingForReview(booking);
      setReviewModalOpen(true);
    }
  }, [bookingsData]);

  const handleCloseReviewModal = useCallback((): void => {
    resetReviewModalState();
  }, [resetReviewModalState]);

  const handleSubmitReview = useCallback(async (values: {
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
  }, [selectedBookingForReview, user, createReviewMutation]);

  const handleComplaintChatSuccess = useCallback((data: { conversation: { _id: string } }) => {
    router.push(`/chat/group?group=${data.conversation._id}`);
  }, [router]);

  const handleComplaintChatError = useCallback(() => {
    message.error(t("booking.client.actions.complainError"));
  }, [t]);

  const openComplaintChatMutation = useStandardizedMutation(
    (bookingId: string) => chatApi.createComplaintConversation(bookingId),
    {
      onSuccess: handleComplaintChatSuccess,
      onError: handleComplaintChatError,
    }
  );

  const handleComplainBooking = useCallback((bookingId: string): void => {
    setSelectedBookingIdForComplaint(bookingId);
    setComplaintModalOpen(true);
  }, []);

  const handleOpenComplaintChat = useCallback((bookingId: string): void => {
    openComplaintChatMutation.mutate(bookingId);
  }, [openComplaintChatMutation]);

  const handleCreateComplaintSuccess = useCallback((data: { conversation: { _id: string } }) => {
    message.success(t("booking.complaint.success"));
    void invalidateClientBookingQueries();
    resetComplaintModalState();
    router.push(`/chat/group?group=${data.conversation._id}`);
  }, [t, invalidateClientBookingQueries, resetComplaintModalState, router]);

  const handleCreateComplaintError = useCallback(() => {
    message.error(t("booking.complaint.error"));
  }, [t]);

  const createComplaintMutation = useStandardizedMutation(
    async (values: {
      bookingId: string;
      reason: DisputeReason;
      description: string;
      evidenceUrls: string[];
    }) => {
      await bookingApi.createDispute(
        values.bookingId,
        values.reason,
        values.description,
        values.evidenceUrls
      );
      return chatApi.createComplaintConversation(values.bookingId);
    },
    {
      onSuccess: handleCreateComplaintSuccess,
      onError: handleCreateComplaintError,
    }
  );

  const handleSubmitComplaint = useCallback(async (values: {
    reason: DisputeReason;
    description: string;
    evidenceUrls: string[];
  }): Promise<void> => {
    if (!selectedBookingIdForComplaint) {
      return;
    }

    createComplaintMutation.mutate({
      bookingId: selectedBookingIdForComplaint,
      ...values,
    });
  }, [selectedBookingIdForComplaint, createComplaintMutation]);

  const columns = useMemo(() => createBookingColumns({
    t,
    formatCurrency,
    serviceMap,
    locale,
    onCancelBooking: handleOpenCancelModal,
    onReviewBooking: handleOpenReviewModal,
    onComplainBooking: handleComplainBooking,
    onOpenComplaintChat: handleOpenComplaintChat,
  }), [t, formatCurrency, serviceMap, locale, handleOpenCancelModal, handleOpenReviewModal, handleComplainBooking, handleOpenComplaintChat]);

  const handleTablePaginationChange = useCallback((pagination: { current?: number; pageSize?: number }) => {
    handleTableChange(
      pagination.current || PAGINATION_DEFAULTS.PAGE,
      pagination.pageSize || PAGINATION_DEFAULTS.LIMIT
    );
  }, [handleTableChange]);

  const rowKey = useCallback((record: Booking) => (record as { id?: string }).id || record._id, []);

  const showTotal = useCallback((totalCount: number) =>
    t("common.pagination.total", { total: totalCount }), [t]);

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
            rowKey={rowKey}
            pagination={{
              current: page,
              pageSize: limit,
              total: bookingsData?.pagination?.total || 0,
              showSizeChanger: true,
              showTotal,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
            }}
            onChange={handleTablePaginationChange}
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
            onOpenComplaintChat={handleOpenComplaintChat}
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
      <ComplaintModal
        open={complaintModalOpen}
        onCancel={resetComplaintModalState}
        onOk={handleSubmitComplaint}
        loading={createComplaintMutation.isPending}
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
