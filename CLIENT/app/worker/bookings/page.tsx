"use client";

import { useState, Fragment, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Table,
  Space,
  Typography,
  message,
  Pagination,
  Empty,
  Spin,
} from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStandardizedMutation } from "@/lib/hooks/use-standardized-mutation";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { bookingApi } from "@/lib/api/booking.api";
import { chatApi } from "@/lib/api/chat.api";
import type { BookingQuery, Booking } from "@/lib/types/booking";
import { BookingStatus } from "@/lib/types/booking";
import { useCurrencyStore } from "@/lib/stores/currency.store";
import { AuthGuard } from "@/lib/components/auth-guard";
import {
  PAGINATION_DEFAULTS,
  PAGE_SIZE_OPTIONS,
  DATE_FORMAT_ISO,
} from "@/app/constants/constants";
import {
  createWorkerBookingColumns,
  WorkerActionType,
  CancellationReason,
} from "@/app/worker/bookings/constants/booking.constants";
import { WorkerBookingCard } from "@/app/worker/bookings/components/WorkerBookingCard";
import { WorkerBookingActionModal } from "@/app/worker/bookings/components/WorkerBookingActionModal";
import { BookingFilters } from "@/app/components/BookingFilters";
import styles from "@/app/worker/bookings/page.module.scss";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useMobile } from "@/lib/hooks/use-mobile";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { useServicesMap } from "@/lib/hooks/use-services-map";
import {
  BOOKING_QUERY_KEYS,
  BookingPageConfig,
  FILTER_VALUE_ALL,
} from "@/app/bookings/constants/bookings-page.constants";

const { Title } = Typography;

function WorkerBookingsContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { handleError } = useErrorHandler();
  const queryClient = useQueryClient();
  const { locale } = useI18n();
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);
  const { page, limit, handleTableChange, resetPage } = usePagination();
  const [statusFilter, setStatusFilter] = useState<BookingStatus | undefined>(
    undefined
  );
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [actionModalOpen, setActionModalOpen] = useState<boolean>(false);
  const [currentBookingId, setCurrentBookingId] = useState<string>("");
  const [currentAction, setCurrentAction] = useState<WorkerActionType | null>(
    null
  );
  const [workerResponse, setWorkerResponse] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<CancellationReason | undefined>(
    undefined
  );
  const isMobile = useMobile();

  const { serviceMap } = useServicesMap();

  const resetActionModalState = useCallback((): void => {
    setActionModalOpen(false);
    setCurrentBookingId("");
    setCurrentAction(null);
    setWorkerResponse("");
    setCancelReason(undefined);
  }, []);

  const invalidateWorkerBookingQueries = useCallback(() => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: [BOOKING_QUERY_KEYS.WORKER_BOOKINGS],
      }),
      queryClient.invalidateQueries({
        queryKey: [BOOKING_QUERY_KEYS.ALL_SERVICES],
      }),
    ]);
  }, [queryClient]);

  const query: BookingQuery = {
    page,
    limit,
    role: "worker",
    status: statusFilter,
    start_date: dateRange?.[0]?.format(DATE_FORMAT_ISO),
    end_date: dateRange?.[1]?.format(DATE_FORMAT_ISO),
  };

  const { data: bookingsData, isLoading, error: bookingsError } = useQuery({
    queryKey: [BOOKING_QUERY_KEYS.WORKER_BOOKINGS, query],
    queryFn: () => bookingApi.getMyBookings(query),
    retry: false,
  });

  const updateStatusMutation = useStandardizedMutation(
    ({
      bookingId,
      status,
      workerResponse,
    }: {
      bookingId: string;
      status: BookingStatus;
      workerResponse?: string;
    }) => bookingApi.updateBookingStatus(bookingId, status, workerResponse),
    {
      onSuccess: () => {
        message.success(t("booking.worker.actions.success"));
        void invalidateWorkerBookingQueries();
        resetActionModalState();
      },
    }
  );

  const cancelBookingMutation = useStandardizedMutation(
    ({
      bookingId,
      reason,
      notes,
    }: {
      bookingId: string;
      reason: string;
      notes?: string;
    }) => bookingApi.cancelBooking(bookingId, reason, notes),
    {
      onSuccess: () => {
        message.success(t("booking.worker.actions.cancelSuccess"));
        void invalidateWorkerBookingQueries();
        resetActionModalState();
      },
    }
  );

  const openComplaintChatMutation = useStandardizedMutation(
    (bookingId: string) => chatApi.createComplaintConversation(bookingId),
    {
      onSuccess: (data) => {
        router.push(`/chat/group?group=${data.conversation._id}`);
      },
      onError: () => {
        message.error(t("booking.client.actions.complainError"));
      },
    }
  );

  const handleStatusFilterChange = useCallback((
    value: BookingStatus | typeof FILTER_VALUE_ALL
  ): void => {
    setStatusFilter(value === FILTER_VALUE_ALL ? undefined : value);
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
    setDateRange(null);
    resetPage();
  }, [resetPage]);

  const handleRefreshBookings = useCallback(async (): Promise<void> => {
    await invalidateWorkerBookingQueries();
    await message.loading(
      t("booking.worker.actions.refreshing"),
      BookingPageConfig.REFRESH_MESSAGE_DURATION_SECONDS
    );
    message.success(t("booking.worker.actions.refreshSuccess"));
  }, [invalidateWorkerBookingQueries, t]);

  const handleAction = useCallback((
    bookingId: string,
    action: WorkerActionType,
    response?: string
  ): void => {
    if (
      action === WorkerActionType.REJECT ||
      action === WorkerActionType.CANCEL
    ) {
      setCurrentBookingId(bookingId);
      setCurrentAction(action);
      setActionModalOpen(true);
      return;
    }

    let status: BookingStatus;
    switch (action) {
      case WorkerActionType.CONFIRM:
        status = BookingStatus.CONFIRMED;
        break;
      case WorkerActionType.START:
        status = BookingStatus.IN_PROGRESS;
        break;
      case WorkerActionType.COMPLETE:
        status = BookingStatus.COMPLETED;
        break;
      default:
        return;
    }

    updateStatusMutation.mutate({
      bookingId,
      status,
      workerResponse: response,
    });
  }, [updateStatusMutation]);

  const handleOpenComplaintChat = useCallback((bookingId: string): void => {
    openComplaintChatMutation.mutate(bookingId);
  }, [openComplaintChatMutation]);

  const handleModalConfirm = useCallback((): void => {
    if (!currentAction || !currentBookingId) return;

    if (currentAction === WorkerActionType.CANCEL) {
      if (!cancelReason) return;
      cancelBookingMutation.mutate({
        bookingId: currentBookingId,
        reason: cancelReason,
        notes: workerResponse,
      });
    } else if (currentAction === WorkerActionType.REJECT) {
      updateStatusMutation.mutate({
        bookingId: currentBookingId,
        status: BookingStatus.REJECTED,
        workerResponse,
      });
    }
  }, [currentAction, currentBookingId, cancelReason, workerResponse, cancelBookingMutation, updateStatusMutation]);

  const columns = useMemo(() => createWorkerBookingColumns({
    t,
    formatCurrency,
    onAction: handleAction,
    onOpenComplaintChat: handleOpenComplaintChat,
    serviceMap,
    locale,
  }), [t, formatCurrency, handleAction, handleOpenComplaintChat, serviceMap, locale]);

  useEffect(() => {
    if (bookingsError) {
      handleError(bookingsError);
    }
  }, [bookingsError, handleError]);

  return (
    <>
      <div className={styles.container}>
          <Space className={styles.headerSpace}>
            <Title level={2} className={styles.title}>
              <CalendarOutlined className={styles.titleIcon} />
              {t("booking.worker.list.title")}
            </Title>
          </Space>

          <Card>
            <BookingFilters
              statusFilter={statusFilter}
              dateRange={dateRange}
              isLoading={isLoading}
              onStatusChange={handleStatusFilterChange}
              onDateRangeChange={handleDateRangeChange}
              onReset={handleResetFilters}
              onRefresh={handleRefreshBookings}
              className={styles.filtersRow}
            />

            {isMobile ? (
              <Spin spinning={isLoading}>
                {(bookingsData?.data ?? []).length === 0 && !isLoading ? (
                  <Empty />
                ) : (
                  <Fragment>
                    <Space
                      orientation="vertical"
                      size="middle"
                      className={styles.mobileListSpace}
                    >
                      {(bookingsData?.data ?? []).map((record) => (
                        <WorkerBookingCard
                          key={record._id}
                          booking={record}
                          onAction={handleAction}
                          onOpenComplaintChat={handleOpenComplaintChat}
                          serviceMap={serviceMap}
                          locale={locale}
                          t={t}
                        />
                      ))}
                    </Space>
                    <Pagination
                      current={page}
                      pageSize={limit}
                      total={bookingsData?.pagination?.total ?? 0}
                      showSizeChanger
                      showTotal={(total) =>
                        t("common.pagination.total", { total })
                      }
                      pageSizeOptions={PAGE_SIZE_OPTIONS}
                      onChange={(newPage, newPageSize) =>
                        handleTableChange(
                          newPage,
                          newPageSize ?? PAGINATION_DEFAULTS.LIMIT
                        )
                      }
                    />
                  </Fragment>
                )}
              </Spin>
            ) : (
              <Table<Booking>
                columns={columns}
                dataSource={bookingsData?.data || []}
                loading={isLoading}
                rowKey={(record) => record._id}
                pagination={{
                  current: page,
                  pageSize: limit,
                  total: bookingsData?.pagination?.total || 0,
                  showSizeChanger: true,
                  showTotal: (total) =>
                    t("common.pagination.total", { total }),
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
            )}
          </Card>
      </div>
      <WorkerBookingActionModal
        open={actionModalOpen}
        action={currentAction}
        workerResponse={workerResponse}
        onWorkerResponseChange={setWorkerResponse}
        cancelReason={cancelReason}
        onCancelReasonChange={setCancelReason}
        onConfirm={handleModalConfirm}
        onCancel={resetActionModalState}
        confirmLoading={
          updateStatusMutation.isPending || cancelBookingMutation.isPending
        }
        t={t}
      />
    </>
  );
}

export default function WorkerBookingsPage() {
  return (
    <AuthGuard>
      <WorkerBookingsContent />
    </AuthGuard>
  );
}
