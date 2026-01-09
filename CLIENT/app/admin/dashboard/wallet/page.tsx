"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Card,
  Space,
  Typography,
  Select,
  Input,
  Button,
  Tag,
  Space as AntSpace,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { walletApi } from "@/lib/api/wallet.api";
import type { AdminTransactionHistoryQuery } from "@/lib/api/wallet.api";
import type { WalletTransaction } from "@/lib/api/wallet.api";
import { TransactionType, TransactionStatus } from "@/lib/constants/wallet";
import { useCurrencyStore } from "@/lib/stores/currency.store";
import type { ColumnsType } from "antd/es/table";
import { UserProfile } from "@/lib/api";
import {
  PAGE_SIZE_OPTIONS,
  PAGINATION_DEFAULTS,
} from "@/app/constants/constants";
import { formatDateTime } from "@/app/func/func";
import {
  getStatusTagColor,
  getTypeTagColor,
  TableColumnKeys,
} from "@/app/admin/dashboard/wallet/constants/wallet.constants";

const { Title } = Typography;
const { Option } = Select;

export default function AdminWalletPage() {
  const { t } = useI18n();
  const { handleError } = useErrorHandler();
  const formatCurrency = useCurrencyStore((state) => state.formatCurrency);

  const [filters, setFilters] = useState<AdminTransactionHistoryQuery>({
    page: PAGINATION_DEFAULTS.PAGE,
    limit: PAGINATION_DEFAULTS.LIMIT,
  });
  const [userIdFilter, setUserIdFilter] = useState<string>("");

  const {
    data: transactionData,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["admin-transaction-history", filters],
    queryFn: () => walletApi.getAdminTransactionHistory(filters),
  });

  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error, handleError]);

  const handleFilterChange = (
    key: keyof AdminTransactionHistoryQuery,
    value: string | number | undefined
  ): void => {
    setFilters((prev) => {
      const updatedFilters = { ...prev, page: PAGINATION_DEFAULTS.PAGE };
      if (value === undefined || value === null || value === "") {
        const { [key]: _, ...rest } = updatedFilters;
        return rest as AdminTransactionHistoryQuery;
      }
      return { ...updatedFilters, [key]: value };
    });
  };

  const handleUserIdFilterChange = (value: string): void => {
    setUserIdFilter(value);
  };

  const handleSearch = (): void => {
    setFilters((prev) => ({
      ...prev,
      user_id: userIdFilter.trim() || undefined,
      page: PAGINATION_DEFAULTS.PAGE,
    }));
  };

  const handleClearFilters = (): void => {
    setUserIdFilter("");
    setFilters({
      page: PAGINATION_DEFAULTS.PAGE,
      limit: PAGINATION_DEFAULTS.LIMIT,
    });
  };

  const handleTableChange = (page: number, pageSize: number): void => {
    setFilters((prev) => ({
      ...prev,
      page,
      limit: pageSize,
    }));
  };

  const columns: ColumnsType<WalletTransaction> = [
    {
      title: t("admin.wallet.table.id"),
      dataIndex: TableColumnKeys.ID,
      key: TableColumnKeys.ID,
      width: 100,
      ellipsis: true,
    },
    {
      title: t("admin.wallet.table.userId"),
      dataIndex: TableColumnKeys.USER_ID,
      key: TableColumnKeys.USER_ID,
      width: 150,
      render: (user: UserProfile | string) =>
        (user as UserProfile).full_name || (user as string),
    },
    {
      title: t("admin.wallet.table.type"),
      dataIndex: TableColumnKeys.TYPE,
      key: TableColumnKeys.TYPE,
      width: 120,
      render: (type: TransactionType) => (
        <Tag color={getTypeTagColor(type)}>
          {t(`wallet.transactionType.${type}`)}
        </Tag>
      ),
    },
    {
      title: t("admin.wallet.table.amount"),
      dataIndex: TableColumnKeys.AMOUNT,
      key: TableColumnKeys.AMOUNT,
      width: 150,
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: t("admin.wallet.table.status"),
      dataIndex: TableColumnKeys.STATUS,
      key: TableColumnKeys.STATUS,
      width: 120,
      render: (status: TransactionStatus) => (
        <Tag color={getStatusTagColor(status)}>
          {t(`wallet.transactionStatus.${status}`)}
        </Tag>
      ),
    },
    {
      title: t("admin.wallet.table.gateway"),
      dataIndex: TableColumnKeys.GATEWAY,
      key: TableColumnKeys.GATEWAY,
      width: 150,
      render: (gateway: string | undefined) => gateway || "-",
    },
    {
      title: t("admin.wallet.table.description"),
      dataIndex: TableColumnKeys.DESCRIPTION,
      key: TableColumnKeys.DESCRIPTION,
      ellipsis: true,
      render: (description: string | undefined) => description || "-",
    },
    {
      title: t("admin.wallet.table.createdAt"),
      dataIndex: TableColumnKeys.CREATED_AT,
      key: TableColumnKeys.CREATED_AT,
      width: 180,
      render: (createdAt: string) => formatDateTime(createdAt),
    },
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Title level={2}>{t("admin.wallet.title")}</Title>
      <Card>
        <AntSpace
          orientation="vertical"
          size="middle"
          style={{ width: "100%" }}
        >
          <AntSpace wrap size={16}>
            <Input
              placeholder={t("admin.wallet.filters.userId")}
              value={userIdFilter}
              size="large"
              onChange={(e) => handleUserIdFilterChange(e.target.value)}
              style={{ width: 200 }}
              allowClear
            />

            <Select
              placeholder={t("admin.wallet.filters.type")}
              value={filters.type}
              onChange={(value) =>
                handleFilterChange("type", value || undefined)
              }
              style={{ width: 150 }}
              allowClear
              size="large"
            >
              {Object.values(TransactionType).map((type) => (
                <Option key={type} value={type}>
                  {t(`wallet.transactionType.${type}`)}
                </Option>
              ))}
            </Select>

            <Select
              placeholder={t("admin.wallet.filters.status")}
              value={filters.status}
              size="large"
              onChange={(value) =>
                handleFilterChange("status", value || undefined)
              }
              style={{ width: 150 }}
              allowClear
            >
              {Object.values(TransactionStatus).map((status) => (
                <Option key={status} value={status}>
                  {t(`wallet.transactionStatus.${status}`)}
                </Option>
              ))}
            </Select>

            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              size="large"
            >
              {t("common.search")}
            </Button>

            <Button
              size="large"
              icon={<ClearOutlined />}
              onClick={handleClearFilters}
            >
              {t("common.clear")}
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={isLoading}
              size="large"
            >
              {t("common.refresh")}
            </Button>
          </AntSpace>
        </AntSpace>
      </Card>

      <Card>
        <Table<WalletTransaction>
          columns={columns}
          dataSource={transactionData?.data || []}
          loading={isLoading}
          rowKey={(record) => record.id}
          pagination={{
            current:
              transactionData?.pagination?.page || PAGINATION_DEFAULTS.PAGE,
            pageSize:
              transactionData?.pagination?.limit || PAGINATION_DEFAULTS.LIMIT,
            total: transactionData?.pagination?.total || 0,
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
    </Space>
  );
}
