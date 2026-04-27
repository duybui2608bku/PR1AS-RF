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
  Space as AntSpace,
  message,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStandardizedMutation } from "@/lib/hooks/use-standardized-mutation";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { userApi, type GetUsersQuery, type User } from "@/lib/api/user.api";
import {
  UserRole,
  UserStatus,
} from "./constants/user.constants";
import {
  PAGE_SIZE_OPTIONS,
  PAGINATION_DEFAULTS,
} from "@/app/constants/constants";
import { buildUserColumns } from "./constants/user-table-columns";
import { UpdateStatusModal } from "./components/UpdateStatusModal";
import styles from "./page.module.scss";

const { Title } = Typography;
const { Option } = Select;

export default function AdminUserPage() {
  const { t } = useI18n();
  const { handleError } = useErrorHandler();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<GetUsersQuery>({
    page: PAGINATION_DEFAULTS.PAGE,
    limit: PAGINATION_DEFAULTS.LIMIT,
  });
  const [searchText, setSearchText] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState<boolean>(false);
  const [newStatus, setNewStatus] = useState<UserStatus | null>(null);

  const {
    data: usersData,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["admin-users", filters],
    queryFn: () => userApi.getUsers(filters),
  });

  const updateStatusMutation = useStandardizedMutation(
    async ({
      userId,
      status,
    }: {
      userId: string;
      status: UserStatus;
    }) => {
      return await userApi.updateUserStatus(userId, { status });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        message.success(t("admin.user.updateStatus.success"));
        setStatusModalVisible(false);
        setSelectedUser(null);
        setNewStatus(null);
      },
    }
  );

  useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error, handleError]);

  const handleFilterChange = (
    key: keyof GetUsersQuery,
    value: string | number | undefined
  ): void => {
    setFilters((prev) => {
      const updatedFilters = { ...prev, page: PAGINATION_DEFAULTS.PAGE };
      if (value === undefined || value === null || value === "") {
        const { [key]: _, ...rest } = updatedFilters;
        return rest as GetUsersQuery;
      }
      return { ...updatedFilters, [key]: value };
    });
  };

  const handleSearchTextChange = (value: string): void => {
    setSearchText(value);
  };

  const handleSearch = (): void => {
    setFilters((prev) => ({
      ...prev,
      search: searchText.trim() || undefined,
      page: PAGINATION_DEFAULTS.PAGE,
    }));
  };

  const handleClearFilters = (): void => {
    setSearchText("");
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

  const handleStatusUpdateClick = (user: User): void => {
    setSelectedUser(user);
    setNewStatus(
      user.status === UserStatus.ACTIVE ? UserStatus.BANNED : UserStatus.ACTIVE
    );
    setStatusModalVisible(true);
  };

  const handleStatusUpdateConfirm = (): void => {
    if (selectedUser && newStatus) {
      updateStatusMutation.mutate({
        userId: selectedUser._id,
        status: newStatus,
      });
    }
  };

  const handleStatusModalCancel = (): void => {
    setStatusModalVisible(false);
    setSelectedUser(null);
    setNewStatus(null);
  };

  const columns = buildUserColumns({
    t,
    onUpdateStatus: handleStatusUpdateClick,
  });

  return (
    <Space orientation="vertical" size="large" className={styles.spaceFull}>
      <Title level={2}>{t("admin.user.title")}</Title>
      <Card>
        <AntSpace orientation="vertical" size="middle" className={styles.spaceFull}>
          <AntSpace wrap size={16}>
            <Input
              placeholder={t("admin.user.filters.search")}
              value={searchText}
              size="large"
              onChange={(e) => handleSearchTextChange(e.target.value)}
              className={styles.searchInput}
              allowClear
              onPressEnter={handleSearch}
            />

            <Select
              placeholder={t("admin.user.filters.role")}
              value={filters.role}
              onChange={(value) =>
                handleFilterChange("role", value || undefined)
              }
              className={styles.filterSelect}
              allowClear
              size="large"
            >
              {Object.values(UserRole).map((role) => (
                <Option key={role} value={role}>
                  {t(`admin.user.role.${role}`)}
                </Option>
              ))}
            </Select>

            <Select
              placeholder={t("admin.user.filters.status")}
              value={filters.status}
              size="large"
              onChange={(value) =>
                handleFilterChange("status", value || undefined)
              }
              className={styles.filterSelect}
              allowClear
            >
              {Object.values(UserStatus).map((status) => (
                <Option key={status} value={status}>
                  {t(`admin.user.status.${status}`)}
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
        <Table<User>
          columns={columns}
          dataSource={usersData?.data || []}
          loading={isLoading}
          rowKey={(record) => record._id}
          pagination={{
            current: usersData?.pagination?.page || PAGINATION_DEFAULTS.PAGE,
            pageSize: usersData?.pagination?.limit || PAGINATION_DEFAULTS.LIMIT,
            total: usersData?.pagination?.total || 0,
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

      <UpdateStatusModal
        open={statusModalVisible}
        selectedUser={selectedUser}
        newStatus={newStatus}
        isSubmitting={updateStatusMutation.isPending}
        onConfirm={handleStatusUpdateConfirm}
        onCancel={handleStatusModalCancel}
        t={t}
      />
    </Space>
  );
}
