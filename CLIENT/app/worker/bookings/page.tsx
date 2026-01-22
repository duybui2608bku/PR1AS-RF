"use client";

import { useMemo, useState, useEffect, Fragment } from "react";
import {
  Layout,
  Card,
  Table,
  Space,
  Typography,
  Select,
  Row,
  Col,
  message,
  DatePicker,
  Button,
  Pagination,
  Empty,
  Spin,
} from "antd";
import { CalendarOutlined, ReloadOutlined, UndoOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { bookingApi } from "@/lib/api/booking.api";
import type { BookingQuery, Booking } from "@/lib/types/booking";
import { BookingStatus, BookingPaymentStatus } from "@/lib/types/booking";
import { useCurrencyStore } from "@/lib/stores/currency.store";
import { AuthGuard } from "@/lib/components/auth-guard";
import { Header } from "@/app/components/header";
import { Footer } from "@/app/components/footer";
import {
  PAGINATION_DEFAULTS,
  PAGE_SIZE_OPTIONS,
  DATE_FORMAT_ISO,
} from "@/app/constants/constants";
import {
  createWorkerBookingColumns,
  WorkerActionType,
  CANCLE_REASON,
} from "@/app/worker/bookings/constants/booking.constants";
import { WorkerBookingCard } from "@/app/worker/bookings/components/WorkerBookingCard";
import { WorkerBookingActionModal } from "@/app/worker/bookings/components/WorkerBookingActionModal";
import { UserRole } from "@/lib/constants/routes";
import { Breakpoint, Spacing } from "@/lib/constants/ui.constants";
import type { Service } from "@/lib/types/worker";
import { useApiQueryData } from "@/lib/hooks/use-api";
import { useI18n } from "@/lib/hooks/use-i18n";

const { Title } = Typography;
const { Content } = Layout;
const { Option } = Select;
const { RangePicker } = DatePicker;

function WorkerBookingsContent() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { locale } = useI18n();
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
  const [actionModalOpen, setActionModalOpen] = useState<boolean>(false);
  const [currentBookingId, setCurrentBookingId] = useState<string>("");
  const [currentAction, setCurrentAction] = useState<WorkerActionType | null>(
    null
  );
  const [workerResponse, setWorkerResponse] = useState<string>("");
  const [cancelReason, setCancelReason] = useState<CANCLE_REASON | undefined>(
    undefined
  );
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = (): void => {
      setIsMobile(window.innerWidth < Breakpoint.MOBILE);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data: allServicesResponse } = useApiQueryData<{
    services: Service[];
    count: number;
  }>(["all-services"], "/services", {
    enabled: true,
  });

  const query: BookingQuery = {
    page,
    limit,
    status: statusFilter,
    payment_status: paymentStatusFilter,
    start_date: dateRange?.[0]?.format(DATE_FORMAT_ISO),
    end_date: dateRange?.[1]?.format(DATE_FORMAT_ISO),
  };

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ["worker-bookings", query],
    queryFn: () => bookingApi.getMyBookings(query),
    retry: false,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      bookingId,
      status,
      workerResponse,
    }: {
      bookingId: string;
      status: BookingStatus;
      workerResponse?: string;
    }) => bookingApi.updateBookingStatus(bookingId, status, workerResponse),
    onSuccess: () => {
      message.success(t("booking.worker.actions.success"));
      queryClient.invalidateQueries({ queryKey: ["worker-bookings"] });
      setActionModalOpen(false);
      setCurrentBookingId("");
      setCurrentAction(null);
      setWorkerResponse("");
      setCancelReason(undefined);
    },
    onError: () => {
      message.error(t("booking.worker.actions.error"));
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: ({
      bookingId,
      reason,
      notes,
    }: {
      bookingId: string;
      reason: string;
      notes?: string;
    }) => bookingApi.cancelBooking(bookingId, UserRole.WORKER, reason, notes),
    onSuccess: () => {
      message.success(t("booking.worker.actions.cancelSuccess"));
      queryClient.invalidateQueries({ queryKey: ["worker-bookings"] });
      setActionModalOpen(false);
      setCurrentBookingId("");
      setCurrentAction(null);
      setWorkerResponse("");
      setCancelReason(undefined);
    },
    onError: () => {
      message.error(t("booking.worker.actions.error"));
    },
  });

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

  const handleRefreshBookings = async (): Promise<void> => {
    queryClient.invalidateQueries({ queryKey: ["worker-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["all-services"] });
    await message.loading(t("booking.worker.actions.refreshing"), 3);
    message.success(t("booking.worker.actions.refreshSuccess"));
  };

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

  const handleAction = (
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
  };

  const handleModalConfirm = (): void => {
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
  };

  const handleModalCancel = (): void => {
    setActionModalOpen(false);
    setCurrentBookingId("");
    setCurrentAction(null);
    setWorkerResponse("");
    setCancelReason(undefined);
  };

  const columns = createWorkerBookingColumns({
    t,
    formatCurrency,
    onAction: handleAction, 
    serviceMap,
    locale,
  });

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background: "var(--ant-color-bg-container)",
      }}
    >
      <Header />
      <Content style={{ padding: "24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Space
            style={{
              marginBottom: 24,
              width: "100%",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Title
              level={2}
              style={{ margin: 0, color: "var(--ant-color-primary)" }}
            >
              <CalendarOutlined style={{ marginRight: 8 }} />
              {t("booking.worker.list.title")}
            </Title>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefreshBookings}
              loading={isLoading}
            >
              {t("common.refresh")}
            </Button>
          </Space>

          <Card>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={6}>
                <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                  <span>{t("booking.list.filters.status")}:</span>
                  <Select
                    style={{ width: "100%" }}
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
                <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                  <span>{t("booking.list.filters.paymentStatus")}:</span>
                  <Select
                    style={{ width: "100%" }}
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
              <Col xs={24} sm={12} md={6}>
                <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                  <span>{t("booking.list.filters.dateRange")}:</span>
                  <RangePicker
                    style={{ width: "100%" }}
                    value={dateRange}
                    onChange={handleDateRangeChange}
                    format={DATE_FORMAT_ISO}
                  />
                </Space>
              </Col>
              <Col xs={24} sm={12} md={2}>
                <Space orientation="vertical" size="small" style={{ width: "100%" }}> 
                  <span/>
                <Button
                  icon={<UndoOutlined />}
                  onClick={handleResetFilters}
                  >
                    {t("common.reset")}
                  </Button>
                </Space>
              </Col>
            </Row>

            {isMobile ? (
              <Spin spinning={isLoading}>
                {(bookingsData?.data ?? []).length === 0 && !isLoading ? (
                  <Empty />
                ) : (
                  <Fragment>
                    <Space
                      orientation="vertical"
                      size="middle"
                      style={{ width: "100%", marginBottom: Spacing.LG }}
                    >
                      {(bookingsData?.data ?? []).map((record) => (
                        <WorkerBookingCard
                          key={record._id}
                          booking={record}
                          onAction={handleAction}
                          formatCurrency={formatCurrency}
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
      </Content>
      <Footer />
      <WorkerBookingActionModal
        open={actionModalOpen}
        action={currentAction}
        workerResponse={workerResponse}
        onWorkerResponseChange={setWorkerResponse}
        cancelReason={cancelReason}
        onCancelReasonChange={setCancelReason}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
        confirmLoading={
          updateStatusMutation.isPending || cancelBookingMutation.isPending
        }
        t={t}
      />
    </Layout>
  );
}

export default function WorkerBookingsPage() {
  return (
    <AuthGuard>
      <WorkerBookingsContent />
    </AuthGuard>
  );
}
