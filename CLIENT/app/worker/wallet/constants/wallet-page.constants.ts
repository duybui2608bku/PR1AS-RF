import type { EscrowStatus } from "@/lib/types/escrow";
import { EscrowStatus as EscrowStatusEnum } from "@/lib/types/escrow";
import { DateRangePreset } from "@/lib/constants/wallet";

export enum WorkerWalletTabKey {
  BALANCE = "balance",
  RECONCILIATION = "reconciliation",
}

export enum FilterValueAll {
  ALL = "all",
}

export const ESCROW_STATUS_OPTIONS: EscrowStatus[] = [
  EscrowStatusEnum.HOLDING,
  EscrowStatusEnum.RELEASED,
  EscrowStatusEnum.REFUNDED,
  EscrowStatusEnum.PARTIALLY_RELEASED,
  EscrowStatusEnum.DISPUTED,
];

export const WORKER_WALLET_DATE_PRESET_OPTIONS = [
  {
    value: DateRangePreset.TODAY,
    labelKey: "worker.wallet.filters.today",
  },
  {
    value: DateRangePreset.YESTERDAY,
    labelKey: "worker.wallet.filters.yesterday",
  },
  {
    value: DateRangePreset.LAST_7_DAYS,
    labelKey: "worker.wallet.filters.last7Days",
  },
  {
    value: DateRangePreset.LAST_14_DAYS,
    labelKey: "worker.wallet.filters.last14Days",
  },
  {
    value: DateRangePreset.THIS_MONTH,
    labelKey: "worker.wallet.filters.thisMonth",
  },
] as const;
