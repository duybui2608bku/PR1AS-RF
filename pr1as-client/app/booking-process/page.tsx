import { SiteLayout } from "@/components/layout/site-layout"
import { getTranslations } from "next-intl/server"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  InfoIcon,
  XCircleIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

export async function generateMetadata() {
  const t = await getTranslations("BookingProcess")
  return {
    title: t("title"),
  }
}

type Step = { title: string; description: string }
type Rule = { label: string; value: string }
type CancelRule = { title: string; description: string }
type Status = { label: string; description: string }

type Tone = "info" | "success" | "warning" | "danger" | "neutral"

/** Soft card backgrounds for highlighted callouts. */
const toneCard: Record<Tone, string> = {
  info: "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30",
  success:
    "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30",
  warning:
    "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30",
  danger: "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30",
  neutral: "border-border bg-muted/40",
}

/** Pill badge styles for status labels. */
const toneBadge: Record<Tone, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
  neutral: "bg-muted text-muted-foreground",
}

// Tones are mapped by index because the array order is fixed across locales.
const ruleTones: Tone[] = ["info", "info", "info", "warning"]
const cancelTones: Tone[] = [
  "success",
  "success",
  "warning",
  "danger",
  "warning",
]
const statusTones: Tone[] = [
  "warning", // Pending
  "info", // Confirmed
  "danger", // Rejected
  "info", // In Progress
  "warning", // Waiting for acceptance
  "success", // Completed
  "neutral", // Cancelled
  "danger", // Disputed
  "neutral", // Expired
]

const cancelIcon: Record<Tone, typeof InfoIcon> = {
  info: InfoIcon,
  success: CheckCircle2Icon,
  warning: AlertTriangleIcon,
  danger: XCircleIcon,
  neutral: InfoIcon,
}

const cancelIconColor: Record<Tone, string> = {
  info: "text-blue-600 dark:text-blue-400",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  neutral: "text-muted-foreground",
}

export default async function BookingProcessPage() {
  const t = await getTranslations("BookingProcess")

  const steps = t.raw("steps") as Step[]
  const rules = t.raw("rules") as Rule[]
  const cancelRules = t.raw("cancelRules") as CancelRule[]
  const statuses = t.raw("statuses") as Status[]

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-3xl px-4 py-14 md:py-20">
        <h1 className="mb-3">{t("title")}</h1>
        <p className="mb-12 text-sm leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>

        {/* Steps */}
        <h2 className="mb-6 text-lg font-semibold">{t("stepsTitle")}</h2>
        <ol className="mb-12 space-y-6">
          {steps.map((step, idx) => (
            <li key={idx} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {idx + 1}
              </span>
              <div>
                <h3 className="font-medium">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* Good to know — timing rules */}
        <h2 className="mb-6 text-lg font-semibold">{t("rulesTitle")}</h2>
        <div className="mb-12 grid gap-3 sm:grid-cols-2">
          {rules.map((rule, idx) => {
            const tone = ruleTones[idx] ?? "info"
            return (
              <div
                key={idx}
                className={cn("rounded-lg border p-4", toneCard[tone])}
              >
                <div className="flex items-center gap-2">
                  <ClockIcon
                    className={cn("size-4 shrink-0", cancelIconColor[tone])}
                  />
                  <h3 className="text-sm font-semibold">{rule.label}</h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {rule.value}
                </p>
              </div>
            )
          })}
        </div>

        {/* Cancellation policy */}
        <h2 className="mb-2 text-lg font-semibold">{t("cancelTitle")}</h2>
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          {t("cancelIntro")}
        </p>
        <div className="mb-6 space-y-3">
          {cancelRules.map((rule, idx) => {
            const tone = cancelTones[idx] ?? "neutral"
            const Icon = cancelIcon[tone]
            return (
              <div
                key={idx}
                className={cn(
                  "flex gap-3 rounded-lg border p-4",
                  toneCard[tone]
                )}
              >
                <Icon
                  className={cn("mt-0.5 size-5 shrink-0", cancelIconColor[tone])}
                />
                <div>
                  <h3 className="text-sm font-semibold">{rule.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {rule.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Dispute window note */}
        <div
          className={cn(
            "mb-12 flex gap-3 rounded-lg border p-4",
            toneCard.info
          )}
        >
          <InfoIcon
            className={cn("mt-0.5 size-5 shrink-0", cancelIconColor.info)}
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("disputeNote")}
          </p>
        </div>

        {/* Payment callout */}
        <div className={cn("mb-12 rounded-lg border p-5", toneCard.warning)}>
          <div className="flex items-center gap-2">
            <AlertTriangleIcon
              className={cn("size-5 shrink-0", cancelIconColor.warning)}
            />
            <h2 className="text-base font-semibold">{t("paymentTitle")}</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("paymentContent")}
          </p>
        </div>

        {/* Booking statuses */}
        <h2 className="mb-6 text-lg font-semibold">{t("statusesTitle")}</h2>
        <dl className="mb-12 space-y-3">
          {statuses.map((status, idx) => {
            const tone = statusTones[idx] ?? "neutral"
            return (
              <div
                key={idx}
                className="flex flex-col gap-1.5 border-b pb-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4"
              >
                <dt className="sm:w-48 sm:shrink-0">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                      toneBadge[tone]
                    )}
                  >
                    {status.label}
                  </span>
                </dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">
                  {status.description}
                </dd>
              </div>
            )
          })}
        </dl>

        {/* Help */}
        <div className="rounded-lg border p-5">
          <h2 className="mb-2 text-base font-semibold">{t("helpTitle")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("helpContent")}
          </p>
        </div>
      </section>
    </SiteLayout>
  )
}
