"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Check, Search } from "lucide-react"
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

const ROLES = [
  {
    id: "client" as Role,
    icon: Search,
    iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-500/20",
    activeClass: "border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 ring-blue-500/20",
    titleKey: "clientTitle",
    descKey: "clientDesc",
    badgeKey: "clientBadge",
  },
  {
    id: "worker" as Role,
    icon: Briefcase,
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20",
    activeClass: "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 ring-emerald-500/20",
    titleKey: "workerTitle",
    descKey: "workerDesc",
    badgeKey: "workerBadge",
  },
] as const

export function OnboardingRoleModal() {
  const t = useTranslations("Onboarding")
  const router = useRouter()
  const hasHydrated = useHasHydrated()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const completeOnboarding = useCompleteOnboarding()

  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Role>("client")

  React.useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !user?.id) return
    if (!user.meta_data?.onboarding_done) {
      setOpen(true)
    }
  }, [hasHydrated, isAuthenticated, user?.id, user?.meta_data?.onboarding_done])

  async function handleConfirm() {
    await completeOnboarding.mutateAsync()
    setOpen(false)
    if (selected === "worker") router.push("/worker/setup")
  }

  async function handleSkip() {
    await completeOnboarding.mutateAsync()
    setOpen(false)
  }

  const isPending = completeOnboarding.isPending

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

          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-xl font-bold tracking-tight sm:text-2xl">
              {t("title")}
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
              {ROLES.map(({ id, icon: Icon, iconClass, activeClass, titleKey, descKey, badgeKey }) => {
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
                        ? cn("border-primary shadow-lg shadow-primary/10 ring-4 ring-primary/5", activeClass)
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
                        <p className="text-sm font-bold text-foreground">{t(titleKey)}</p>
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className={cn(
                            "shrink-0 px-2 py-0 text-[10px] font-bold uppercase tracking-wider",
                            !isActive && "bg-muted/50 text-muted-foreground border-transparent"
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
                      <p className="text-base font-bold text-foreground">{t(titleKey)}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground/80">
                        {t(descKey)}
                      </p>
                      <div className="flex justify-center pt-2">
                        <Badge
                          variant={isActive ? "default" : "secondary"}
                          className={cn(
                            "px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                            !isActive && "bg-muted/50 text-muted-foreground border-transparent"
                          )}
                        >
                          {t(badgeKey)}
                        </Badge>
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 pt-3 sm:flex-col sm:space-x-0">
          <Button
            className="h-11 w-full rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t("loading")}
              </span>
            ) : (
              t("startButton")
            )}
          </Button>
          <Button
            variant="ghost"
            className="h-10 w-full rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={handleSkip}
            disabled={isPending}
          >
            {t("skipButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
