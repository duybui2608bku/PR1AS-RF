import type { UpgradePlanReason } from "@/lib/store/upgrade-plan-store"

/**
 * Backend error codes that mean "this action was blocked by the user's
 * subscription plan." Shared between the axios interceptor (dispatches
 * `plan:restricted`) and `UpgradePlanDialog` (listens for it) so the two
 * can't drift out of sync.
 */
export const PLAN_RESTRICTED_CODE_REASON: Record<string, UpgradePlanReason> = {
  POST_CREATE_FEATURE_DISABLED: "post",
  POST_MONTHLY_LIMIT_EXCEEDED: "post",
  BOOST_PLAN_FEATURE_DISABLED: "boost",
  BOOST_MONTHLY_LIMIT_EXCEEDED: "boost",
}
