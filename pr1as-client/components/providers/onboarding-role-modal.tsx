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
    iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    titleKey: "clientTitle",
    descKey: "clientDesc",
    badgeKey: "clientBadge",
  },
  {
    id: "worker" as Role,
    icon: Briefcase,
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
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
        className="sm:max-w-md"
        hideCloseButton
        overlayClassName="bg-black/60 backdrop-blur-sm"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center text-center sm:text-center">
          <DialogTitle className="text-xl">{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("chooseRole")}
        </p>

        <div className="grid grid-cols-2 gap-3">
          {ROLES.map(({ id, icon: Icon, iconClass, titleKey, descKey, badgeKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              disabled={isPending}
              className={cn(
                "relative flex flex-col items-center rounded-xl border-2 p-4 text-center transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
                selected === id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:border-primary/50 hover:bg-muted/50",
              )}
            >
              {selected === id && (
                <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}

              <div className={cn("mb-3 flex size-12 items-center justify-center rounded-xl", iconClass)}>
                <Icon className="size-6" />
              </div>

              <p className="mb-1 text-sm font-semibold text-foreground">{t(titleKey)}</p>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{t(descKey)}</p>

              <Badge variant="secondary">{t(badgeKey)}</Badge>
            </button>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={handleConfirm} disabled={isPending}>
            {t("startButton")}
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleSkip} disabled={isPending}>
            {t("skipButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
