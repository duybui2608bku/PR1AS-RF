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
  Modal,
  message,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { userApi, type GetUsersQuery, type User } from "@/lib/api/user.api";
import {
  UserStatus,
  UserRole,
  TableColumnKeys,
  getStatusTagColor,
  getRoleTagColor,
} from "./constants/user.constants";
import {
  PAGE_SIZE_OPTIONS,
  PAGINATION_DEFAULTS,
} from "@/app/constants/constants";
import { formatDateTime } from "@/app/func/func";
import type { ColumnsType } from "antd/es/table";

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

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string;
      status: UserStatus;
    }) => {
      return await userApi.updateUserStatus(userId, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      message.success(t("admin.user.updateStatus.success"));
      setStatusModalVisible(false);
      setSelectedUser(null);
      setNewStatus(null);
    },
    onError: (error: unknown) => {
      handleError(error);
    },
  });

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

  const columns: ColumnsType<User> = [
    {
      title: t("admin.user.table.id"),
      dataIndex: TableColumnKeys.ID,
      key: TableColumnKeys.ID,
      width: 100,
      ellipsis: true,
    },
    {
      title: t("admin.user.table.email"),
      dataIndex: TableColumnKeys.EMAIL,
      key: TableColumnKeys.EMAIL,
      width: 200,
      ellipsis: true,
    },
    {
      title: t("admin.user.table.fullName"),
      dataIndex: TableColumnKeys.FULL_NAME,
      key: TableColumnKeys.FULL_NAME,
      width: 150,
      render: (fullName: string | null | undefined) => fullName || "-",
    },
    {
      title: t("admin.user.table.phone"),
      dataIndex: TableColumnKeys.PHONE,
      key: TableColumnKeys.PHONE,
      width: 120,
      render: (phone: string | null | undefined) => phone || "-",
    },
    {
      title: t("admin.user.table.roles"),
      dataIndex: TableColumnKeys.ROLES,
      key: TableColumnKeys.ROLES,
      width: 150,
      render: (roles: string[] | undefined) => {
        if (!roles || roles.length === 0) return "-";
        return (
          <Space wrap size={4}>
            {roles.map((role) => {
              const roleEnum = role as UserRole;
              return (
                <Tag key={role} color={getRoleTagColor(roleEnum)}>
                  {t(`admin.user.role.${roleEnum}`)}
                </Tag>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: t("admin.user.table.status"),
      dataIndex: TableColumnKeys.STATUS,
      key: TableColumnKeys.STATUS,
      width: 100,
      render: (status: string | undefined) => {
        if (!status) return "-";
        const statusEnum = status as UserStatus;
        return (
          <Tag color={getStatusTagColor(statusEnum)}>
            {t(`admin.user.status.${statusEnum}`)}
          </Tag>
        );
      },
    },
    {
      title: t("admin.user.table.verifyEmail"),
      dataIndex: TableColumnKeys.VERIFY_EMAIL,
      key: TableColumnKeys.VERIFY_EMAIL,
      width: 100,
      render: (verifyEmail: boolean | undefined) => (
        <Tag color={verifyEmail ? "green" : "orange"}>
          {verifyEmail
            ? t("admin.user.verifyEmail.verified")
            : t("admin.user.verifyEmail.unverified")}
        </Tag>
      ),
    },
    {
      title: t("admin.user.table.createdAt"),
      dataIndex: TableColumnKeys.CREATED_AT,
      key: TableColumnKeys.CREATED_AT,
      width: 180,
      render: (createdAt: string) => formatDateTime(createdAt),
    },
    {
      title: t("admin.user.table.actions"),
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_: unknown, record: User) => (
        <Button
          type="link"
          size="small"
          onClick={() => handleStatusUpdateClick(record)}
        >
          {t("admin.user.actions.updateStatus")}
        </Button>
      ),
    },
  ];

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Title level={2}>{t("admin.user.title")}</Title>
      <Card>
        <AntSpace
          orientation="vertical"
          size="middle"
          style={{ width: "100%" }}
        >
          <AntSpace wrap size={16}>
            <Input
              placeholder={t("admin.user.filters.search")}
              value={searchText}
              size="large"
              onChange={(e) => handleSearchTextChange(e.target.value)}
              style={{ width: 400 }}
              allowClear
              onPressEnter={handleSearch}
            />

            <Select
              placeholder={t("admin.user.filters.role")}
              value={filters.role}
              onChange={(value) =>
                handleFilterChange("role", value || undefined)
              }
              style={{ width: 150 }}
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
              style={{ width: 150 }}
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

      <Modal
        title={t("admin.user.updateStatus.title")}
        open={statusModalVisible}
        onOk={handleStatusUpdateConfirm}
        onCancel={handleStatusModalCancel}
        confirmLoading={updateStatusMutation.isPending}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
        centered
      >
        {selectedUser && newStatus && (
          <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
            <Typography.Text>
              {t("admin.user.updateStatus.message", {
                email: selectedUser.email,
                currentStatus: t(`admin.user.status.${selectedUser.status}`),
                newStatus: t(`admin.user.status.${newStatus}`),
              })}
            </Typography.Text>
          </Space>
        )}
      </Modal>
    </Space>
  );
}
