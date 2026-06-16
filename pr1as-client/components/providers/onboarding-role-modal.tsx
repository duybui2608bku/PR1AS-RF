"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Briefcase,
  CalendarCheck,
  Check,
  Clock,
  HeartHandshake,
  MapPin,
  MessageCircle,
  Newspaper,
  Search,
  Shield,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

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

type Feature = {
  icon: LucideIcon
  colorClass: string
  labelKey: string
}

type IntroStep = {
  icon: LucideIcon
  gradient: string
  glowClass: string
  titleKey: string
  descKey: string
  features: readonly [Feature, Feature]
}

/** Step-by-step intro slides shown before the role picker. */
const INTRO_STEPS: readonly IntroStep[] = [
  {
    icon: HeartHandshake,
    gradient: "from-violet-500 to-purple-400",
    glowClass: "shadow-violet-500/40",
    titleKey: "introWelcomeTitle",
    descKey: "introWelcomeDesc",
    features: [
      { icon: Shield, colorClass: "text-violet-400", labelKey: "introWelcomeFeat1" },
      { icon: Star, colorClass: "text-amber-400", labelKey: "introWelcomeFeat2" },
    ],
  },
  {
    icon: Search,
    gradient: "from-blue-500 to-sky-400",
    glowClass: "shadow-blue-500/40",
    titleKey: "introServicesTitle",
    descKey: "introServicesDesc",
    features: [
      { icon: MapPin, colorClass: "text-sky-400", labelKey: "introServicesFeat1" },
      { icon: Clock, colorClass: "text-blue-400", labelKey: "introServicesFeat2" },
    ],
  },
  {
    icon: Newspaper,
    gradient: "from-purple-500 to-pink-500",
    glowClass: "shadow-purple-500/40",
    titleKey: "introPostsTitle",
    descKey: "introPostsDesc",
    features: [
      { icon: Newspaper, colorClass: "text-purple-400", labelKey: "introPostsFeat1" },
      { icon: Star, colorClass: "text-amber-400", labelKey: "introPostsFeat2" },
    ],
  },
  {
    icon: CalendarCheck,
    gradient: "from-emerald-500 to-teal-400",
    glowClass: "shadow-emerald-500/40",
    titleKey: "introBookingTitle",
    descKey: "introBookingDesc",
    features: [
      { icon: MessageCircle, colorClass: "text-emerald-400", labelKey: "introBookingFeat1" },
      { icon: Wallet, colorClass: "text-teal-400", labelKey: "introBookingFeat2" },
    ],
  },
] as const

const ROLES = [
  {
    id: "client" as Role,
    icon: Search,
    iconGradient: "from-blue-500 to-cyan-400",
    iconShadow: "shadow-blue-500/30",
    activeClass: "border-blue-400 ring-4 ring-blue-400/20",
    checkClass: "bg-blue-500",
    titleKey: "clientTitle",
    descKey: "clientDesc",
    badgeKey: "clientBadge",
  },
  {
    id: "worker" as Role,
    icon: Briefcase,
    iconGradient: "from-emerald-500 to-emerald-400",
    iconShadow: "shadow-emerald-500/30",
    activeClass: "border-emerald-400 ring-4 ring-emerald-400/20",
    checkClass: "bg-emerald-500",
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
        className={cn(
          "overflow-hidden border-white/40 bg-white/70 p-0 shadow-2xl backdrop-blur-2xl",
          "dark:border-white/10 dark:bg-[#141626]/60",
          "sm:max-w-[520px]",
        )}
        hideCloseButton
        overlayClassName="bg-background/70 backdrop-blur-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Decorative floating glow blobs */}
        <div className="pointer-events-none absolute -top-24 -left-20 h-60 w-60 animate-pulse rounded-full bg-violet-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-16 h-56 w-56 animate-pulse rounded-full bg-blue-500/25 blur-3xl [animation-delay:1s]" />
        <div className="pointer-events-none absolute bottom-10 -left-16 h-48 w-48 animate-pulse rounded-full bg-emerald-500/20 blur-3xl [animation-delay:2s]" />

        <div className="relative z-10 px-7 pt-6 pb-6">
          {/* Progress indicator */}
          <div className="flex justify-center gap-1.5 pb-6">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step
                    ? "w-7 bg-gradient-to-r from-violet-400 to-blue-400 shadow-[0_0_12px_rgba(124,124,255,0.6)]"
                    : i < step
                      ? "w-1.5 bg-foreground/40"
                      : "w-1.5 bg-foreground/20",
                )}
              />
            ))}
          </div>

          <div className="flex min-h-[300px] flex-col justify-center">
            {intro ? (
              /* ───────── Intro slide ───────── */
              <div className="flex animate-in fade-in slide-in-from-bottom-2 flex-col items-center py-2 text-center duration-500">
                <div className="relative mb-6">
                  <div
                    className={cn(
                      "absolute -inset-3 -z-10 rounded-[32px] bg-gradient-to-br opacity-50 blur-xl",
                      intro.gradient,
                    )}
                  />
                  <div
                    className={cn(
                      "relative grid size-[88px] place-items-center rounded-[26px] bg-gradient-to-br text-white shadow-2xl",
                      "before:absolute before:inset-0 before:rounded-[26px] before:bg-gradient-to-br before:from-white/35 before:to-transparent",
                      intro.gradient,
                      intro.glowClass,
                    )}
                  >
                    <intro.icon className="relative size-10" strokeWidth={1.75} />
                  </div>
                </div>

                <DialogHeader className="items-center text-center">
                  <DialogTitle className="text-2xl font-extrabold tracking-tight">
                    {t(intro.titleKey)}
                  </DialogTitle>
                  <DialogDescription className="text-balance text-center text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                    {t(intro.descKey)}
                  </DialogDescription>
                </DialogHeader>

                {/* Supporting feature chips */}
                <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                  {intro.features.map(({ icon: FeatureIcon, colorClass, labelKey }) => (
                    <span
                      key={labelKey}
                      className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/50 px-3 py-2 text-xs font-semibold backdrop-blur dark:border-white/10 dark:bg-white/5"
                    >
                      <FeatureIcon className={cn("size-3.5", colorClass)} />
                      {t(labelKey)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              /* ───────── Role picker ───────── */
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                <DialogHeader className="items-center text-center">
                  <DialogTitle className="text-2xl font-extrabold tracking-tight">
                    {t("roleStepTitle")}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    {t("subtitle")}
                  </DialogDescription>
                </DialogHeader>

                <p className="mt-5 mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  {t("chooseRole")}
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ROLES.map(
                    ({
                      id,
                      icon: Icon,
                      iconGradient,
                      iconShadow,
                      activeClass,
                      checkClass,
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
                            "group relative flex h-auto flex-col items-start gap-0 whitespace-normal rounded-2xl border-2 p-4 text-left transition-all duration-300",
                            "border-white/40 bg-white/40 backdrop-blur hover:-translate-y-1 hover:bg-white/60",
                            "dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                            "disabled:pointer-events-none disabled:opacity-50",
                            isActive && cn("bg-white/70 dark:bg-white/10", activeClass),
                          )}
                        >
                          {isActive && (
                            <div
                              className={cn(
                                "absolute right-3 top-3 flex size-5 animate-in zoom-in-50 fade-in items-center justify-center rounded-full text-white duration-300",
                                checkClass,
                              )}
                            >
                              <Check className="size-3" strokeWidth={3} />
                            </div>
                          )}

                          <div
                            className={cn(
                              "mb-3 flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110",
                              iconGradient,
                              iconShadow,
                            )}
                          >
                            <Icon className="size-6" />
                          </div>

                          <p className="text-[15px] font-bold text-foreground">
                            {t(titleKey)}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {t(descKey)}
                          </p>
                          <span
                            className={cn(
                              "mt-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                              isActive
                                ? "bg-foreground/15 text-foreground"
                                : "bg-foreground/5 text-muted-foreground",
                            )}
                          >
                            {t(badgeKey)}
                          </span>
                        </Button>
                      )
                    },
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 flex flex-col gap-3 sm:flex-col sm:space-x-0">
            <Button
              className={cn(
                "h-13 w-full rounded-2xl text-[15px] font-bold text-white",
                "bg-gradient-to-br from-[#7c5cff] to-[#5b8cff] shadow-lg shadow-violet-500/40",
                "transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.99]",
              )}
              onClick={handleNext}
              disabled={isPending}
            >
              {isRoleStep && isPending ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
