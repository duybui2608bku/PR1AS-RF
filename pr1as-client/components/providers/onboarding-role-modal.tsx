"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Briefcase,
  CalendarCheck,
  Check,
  HeartHandshake,
  Newspaper,
  Search,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCompleteOnboarding } from "@/lib/hooks/use-auth"
import { useAuthStore, useHasHydrated } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"

type Role = "client" | "worker"

type IntroStep = {
  icon: LucideIcon
  gradient: string
  titleKey: string
  descKey: string
}

/** Step-by-step intro slides shown before the role picker. */
const INTRO_STEPS: readonly IntroStep[] = [
  {
    icon: HeartHandshake,
    gradient: "from-primary to-primary/70",
    titleKey: "introWelcomeTitle",
    descKey: "introWelcomeDesc",
  },
  {
    icon: Search,
    gradient: "from-blue-500 to-sky-400",
    titleKey: "introServicesTitle",
    descKey: "introServicesDesc",
  },
  {
    icon: Newspaper,
    gradient: "from-violet-500 to-fuchsia-400",
    titleKey: "introPostsTitle",
    descKey: "introPostsDesc",
  },
  {
    icon: CalendarCheck,
    gradient: "from-emerald-500 to-teal-400",
    titleKey: "introBookingTitle",
    descKey: "introBookingDesc",
  },
] as const

const ROLES = [
  {
    id: "client" as Role,
    icon: Search,
    iconClass:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20",
    activeClass:
      "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 ring-blue-500/20",
    titleKey: "clientTitle",
    descKey: "clientDesc",
    badgeKey: "clientBadge",
  },
  {
    id: "worker" as Role,
    icon: Briefcase,
    iconClass:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20",
    activeClass:
      "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 ring-emerald-500/20",
    titleKey: "workerTitle",
    descKey: "workerDesc",
    badgeKey: "workerBadge",
  },
] as const

const ROLE_STEP_INDEX = INTRO_STEPS.length
const TOTAL_STEPS = INTRO_STEPS.length + 1

export function OnboardingRoleModal() {
  const t = useTranslations("Onboarding")
  const router = useRouter()
  const hasHydrated = useHasHydrated()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const completeOnboarding = useCompleteOnboarding()

  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const [selected, setSelected] = React.useState<Role>("client")

  React.useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !user?.id) return
    if (!user.meta_data?.onboarding_done) {
      setOpen(true)
    }
  }, [hasHydrated, isAuthenticated, user?.id, user?.meta_data?.onboarding_done])

  const isRoleStep = step === ROLE_STEP_INDEX
  const isPending = completeOnboarding.isPending

  async function handleConfirm() {
    await completeOnboarding.mutateAsync()
    setOpen(false)
    if (selected === "worker") router.push("/worker/setup")
  }

  async function handleSkip() {
    await completeOnboarding.mutateAsync()
    setOpen(false)
  }

  function handleNext() {
    if (isRoleStep) {
      void handleConfirm()
      return
    }
    setStep((s) => Math.min(s + 1, ROLE_STEP_INDEX))
  }

  function handleBack() {
    setStep((s) => Math.max(0, s - 1))
  }

  const intro = isRoleStep ? null : INTRO_STEPS[step]

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[560px]"
        hideCloseButton
        overlayClassName="bg-background/80 backdrop-blur-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="relative overflow-hidden px-1 pt-2 pb-1">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-blue-500/10 blur-3xl" />

          {/* Progress indicator */}
          <div className="relative flex justify-center gap-1.5 pb-1">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step
                    ? "w-5 bg-primary"
                    : i < step
                      ? "w-1.5 bg-primary/40"
                      : "w-1.5 bg-muted-foreground/25",
                )}
              />
            ))}
          </div>

          <div className="relative flex min-h-[300px] flex-col justify-center">
            {intro ? (
              /* ───────── Intro slide ───────── */
              <div className="flex flex-col items-center py-4 text-center">
                <div
                  className={cn(
                    "mb-5 flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br text-white shadow-lg",
                    intro.gradient,
                  )}
                >
                  <intro.icon className="size-9" strokeWidth={1.75} />
                </div>
                <DialogHeader className="items-center text-center">
                  <DialogTitle className="text-xl font-bold tracking-tight sm:text-2xl">
                    {t(intro.titleKey)}
                  </DialogTitle>
                  <DialogDescription className="text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {t(intro.descKey)}
                  </DialogDescription>
                </DialogHeader>
              </div>
            ) : (
              /* ───────── Role picker ───────── */
              <div>
                <DialogHeader className="items-center text-center">
                  <DialogTitle className="text-xl font-bold tracking-tight sm:text-2xl">
                    {t("roleStepTitle")}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    {t("subtitle")}
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-5 space-y-3">
                  <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {t("chooseRole")}
                  </p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {ROLES.map(
                      ({
                        id,
                        icon: Icon,
                        iconClass,
                        activeClass,
                        titleKey,
                        descKey,
                        badgeKey,
                      }) => {
                        const isActive = selected === id
                        return (
                          <Button
                            key={id}
                            variant="ghost"
                            onClick={() => setSelected(id)}
                            disabled={isPending}
                            className={cn(
                              "group relative flex h-auto whitespace-normal rounded-2xl border-2 transition-all duration-300",
                              "flex-row items-center gap-3 p-4 text-left",
                              "sm:flex-col sm:items-stretch sm:gap-0 sm:p-6",
                              "hover:border-primary/50 hover:bg-muted/30",
                              "disabled:pointer-events-none disabled:opacity-50",
                              isActive
                                ? cn(
                                    "border-primary shadow-lg shadow-primary/10 ring-4 ring-primary/5",
                                    activeClass,
                                  )
                                : "border-border bg-background/50",
                            )}
                          >
                            {isActive && (
                              <div className="absolute top-3 right-3 flex h-5 w-5 animate-in zoom-in-50 fade-in duration-300 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-3 w-3" strokeWidth={3} />
                              </div>
                            )}

                            {/* Icon */}
                            <div
                              className={cn(
                                "flex shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110",
                                "h-11 w-11",
                                "sm:mx-auto sm:mb-3 sm:h-14 sm:w-14 sm:rounded-2xl",
                                iconClass,
                              )}
                            >
                              <Icon className="h-5 w-5 sm:h-7 sm:w-7" />
                            </div>

                            {/* Mobile text: horizontal row, badge inline with title */}
                            <div className="flex-1 min-w-0 sm:hidden">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-foreground">
                                  {t(titleKey)}
                                </p>
                                <Badge
                                  variant={isActive ? "default" : "secondary"}
                                  className={cn(
                                    "shrink-0 px-2 py-0 text-[10px] font-bold uppercase tracking-wider",
                                    !isActive &&
                                      "bg-muted/50 text-muted-foreground border-transparent",
                                  )}
                                >
                                  {t(badgeKey)}
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground/80 line-clamp-2">
                                {t(descKey)}
                              </p>
                            </div>

                            {/* Desktop text: vertical centered, badge below description */}
                            <div className="hidden sm:block sm:w-full sm:space-y-1.5 sm:text-center">
                              <p className="text-base font-bold text-foreground">
                                {t(titleKey)}
                              </p>
                              <p className="text-xs leading-relaxed text-muted-foreground/80">
                                {t(descKey)}
                              </p>
                              <div className="flex justify-center pt-2">
                                <Badge
                                  variant={isActive ? "default" : "secondary"}
                                  className={cn(
                                    "px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                                    !isActive &&
                                      "bg-muted/50 text-muted-foreground border-transparent",
                                  )}
                                >
                                  {t(badgeKey)}
                                </Badge>
                              </div>
                            </div>
                          </Button>
                        )
                      },
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 pt-3 sm:flex-col sm:space-x-0">
          <Button
            className="h-11 w-full rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={handleNext}
            disabled={isPending}
          >
            {isRoleStep && isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("loading")}
              </span>
            ) : isRoleStep ? (
              t("startButton")
            ) : (
              t("next")
            )}
          </Button>

          <div className="flex items-center justify-between">
            {step > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={handleBack}
                disabled={isPending}
              >
                <ArrowLeft className="size-4" />
                {t("back")}
              </Button>
            ) : (
              <span />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={handleSkip}
              disabled={isPending}
            >
              {t("skipButton")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
