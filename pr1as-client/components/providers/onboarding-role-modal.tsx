"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Check, Search, Sparkles } from "lucide-react"
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
        className="max-sm:h-screen max-sm:rounded-none max-sm:border-0 sm:max-w-[500px]"
        hideCloseButton
        overlayClassName="bg-background/80 backdrop-blur-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="relative overflow-hidden px-1 pt-4 pb-2">
          {/* Decorative background element */}
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-blue-500/10 blur-3xl" />

          <DialogHeader className="items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("title")}
            </DialogTitle>
            <DialogDescription className="text-balance text-base text-muted-foreground">
              {t("subtitle")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-8 space-y-4">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
              {t("chooseRole")}
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {ROLES.map(({ id, icon: Icon, iconClass, activeClass, titleKey, descKey, badgeKey }) => {
                const isActive = selected === id
                return (
                  <Button
                    key={id}
                    variant="ghost"
                    onClick={() => setSelected(id)}
                    disabled={isPending}
                    className={cn(
                      "group relative flex h-auto flex-col items-center rounded-2xl border-2 p-5 text-center transition-all duration-300",
                      "hover:border-primary/50 hover:bg-muted/30",
                      "disabled:pointer-events-none disabled:opacity-50",
                      isActive
                        ? cn("border-primary shadow-lg shadow-primary/10 ring-4 ring-primary/5", activeClass)
                        : "border-border bg-background/50",
                    )}
                  >
                    {isActive && (
                      <div className="absolute top-3 right-3 flex h-6 w-6 animate-in zoom-in-50 fade-in duration-300 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </div>
                    )}

                    <div
                      className={cn(
                        "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-110",
                        iconClass,
                      )}
                    >
                      <Icon className="h-8 w-8" />
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-base font-bold text-foreground">
                        {t(titleKey)}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground/90 line-clamp-2">
                        {t(descKey)}
                      </p>
                    </div>

                    <div className="mt-4">
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
                  </Button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 pt-4 sm:flex-col sm:space-x-0">
          <Button 
            className="h-12 w-full rounded-xl text-base font-bold shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" 
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
            className="h-11 w-full rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground" 
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
