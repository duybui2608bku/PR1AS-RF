"use client";

import { useState } from "react";
import {
  Layout,
  Card,
  Table,
  Space,
  Typography,
  Select,
  Row,
  Col,
  Modal,
  Input,
  message,
} from "antd";
import { CalendarOutlined } from "@ant-design/icons";
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
} from "@/app/constants/constants";
import {
  createWorkerBookingColumns,
  WorkerActionType,
} from "@/app/worker/bookings/constants/booking.constants";
import { UserRole } from "@/lib/constants/routes";

const { Title } = Typography;
const { Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;

function WorkerBookingsContent() {
  const { t } = useTranslation();
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
  const [actionModalOpen, setActionModalOpen] = useState<boolean>(false);
  const [currentBookingId, setCurrentBookingId] = useState<string>("");
  const [currentAction, setCurrentAction] = useState<WorkerActionType | null>(
    null
  );
  const [workerResponse, setWorkerResponse] = useState<string>("");

  const query: BookingQuery = {
    page,
    limit,
    status: statusFilter,
    payment_status: paymentStatusFilter,
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
      cancelBookingMutation.mutate({
        bookingId: currentBookingId,
        reason: t("booking.worker.actions.cancelReason"),
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
  };

  const getModalTitle = (): string => {
    if (currentAction === WorkerActionType.REJECT) {
      return t("booking.worker.actions.rejectTitle");
    }
    if (currentAction === WorkerActionType.CANCEL) {
      return t("booking.worker.actions.cancelTitle");
    }
    return "";
  };

  const columns = createWorkerBookingColumns({
    t,
    formatCurrency,
    onAction: handleAction,
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
          </Space>

          <Card>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} md={8}>
                <Space>
                  <span>{t("booking.list.filters.status")}:</span>
                  <Select
                    style={{ width: 150 }}
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
              <Col xs={24} sm={12} md={8}>
                <Space>
                  <span>{t("booking.list.filters.paymentStatus")}:</span>
                  <Select
                    style={{ width: 150 }}
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
            </Row>

            <Table<Booking>
              columns={columns}
              dataSource={bookingsData?.data || []}
              loading={isLoading}
              rowKey={(record) => record.id}
              pagination={{
                current: page,
                pageSize: limit,
                total: bookingsData?.pagination?.total || 0,
                showSizeChanger: true,
                showTotal: (total) => t("common.pagination.total", { total }),
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
          </Card>
        </div>
      </Content>
      <Footer />
      <Modal
        open={actionModalOpen}
        title={getModalTitle()}
        onOk={handleModalConfirm}
        onCancel={handleModalCancel}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
        confirmLoading={
          updateStatusMutation.isPending || cancelBookingMutation.isPending
        }
      >
        <Space orientation="vertical" style={{ width: "100%" }}>
          <span>
            {currentAction === WorkerActionType.REJECT
              ? t("booking.worker.actions.rejectMessage")
              : t("booking.worker.actions.cancelMessage")}
          </span>
          <TextArea
            rows={4}
            placeholder={t("booking.worker.actions.responsePlaceholder")}
            value={workerResponse}
            onChange={(e) => setWorkerResponse(e.target.value)}
          />
        </Space>
      </Modal>
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
