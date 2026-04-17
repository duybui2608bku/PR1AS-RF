import { Button, Space, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { TFunction } from "i18next";
import type { User } from "@/lib/api/user.api";
import { formatDateTime } from "@/app/func/func";
import {
  TableColumnKeys,
  UserRole,
  UserStatus,
  getRoleTagColor,
  getStatusTagColor,
} from "./user.constants";

interface BuildUserColumnsParams {
  t: TFunction;
  onUpdateStatus: (user: User) => void;
}

export const buildUserColumns = ({
  t,
  onUpdateStatus,
}: BuildUserColumnsParams): ColumnsType<User> => [
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
      <Button type="link" size="small" onClick={() => onUpdateStatus(record)}>
        {t("admin.user.actions.updateStatus")}
      </Button>
    ),
  },
];
