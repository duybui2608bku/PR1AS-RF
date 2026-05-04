"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, CalendarCheck2, Loader2, LogOut, Menu, Moon, Sun, User, Wallet } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"
import { mainNav } from "@/config/nav"
import { useLogout, useSwitchRole } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/layout/notification-bell"

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const { user, isAuthenticated } = useAuthStore()
  const logoutMutation = useLogout()
  const switchRoleMutation = useSwitchRole()
  const menuContainerRef = React.useRef<HTMLDivElement | null>(null)

  const userRoles = React.useMemo(() => user?.roles ?? [], [user?.roles])
  const lastActiveRole = user?.last_active_role
  const isWorkerActive = lastActiveRole === "worker"
  const hasWorkerRole = userRoles.includes("worker")
  const canSwitchRole = isAuthenticated && (isWorkerActive || hasWorkerRole)

  const switchRoleLabel = isWorkerActive ? "CLIENT" : "WORKER"

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuContainerRef.current) {
        return
      }

      if (!menuContainerRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    window.addEventListener("mousedown", handleClickOutside)
    return () => window.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSwitchRole = async () => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để chuyển role.")
      router.push("/login")
      return
    }

    if (!canSwitchRole) {
      toast.info("Tài khoản chưa có role Worker để chuyển đổi.")
      return
    }

    try {
      await switchRoleMutation.mutateAsync({
        last_active_role: isWorkerActive ? "client" : "worker",
      })
      toast.success("Chuyển trạng thái tài khoản thành công.")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đổi role."
      toast.error(message)
    }
  }

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      setMenuOpen(false)
      toast.success("Đăng xuất thành công.")
      router.push("/login")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể đăng xuất."
      toast.error(message)
    }
  }

  const userMenuItems = [
    { href: "/profile", label: "Hồ sơ", icon: User },
    { href: "/notifications", label: "Thông báo", icon: Bell },
    { href: "/wallet", label: "Ví", icon: Wallet },
    { href: "/booking", label: "Booking", icon: CalendarCheck2 },
  ] as const

  return (
    <header className="bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center">
          <Link href="/" className="font-semibold">
            {siteConfig.name}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwitchRole}
            disabled={switchRoleMutation.isPending}
          >
            {switchRoleMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>{switchRoleLabel}</span>
          </Button>
          <ThemeToggle />
          {isAuthenticated && <NotificationBell />}
          <div ref={menuContainerRef} className="relative hidden md:block">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mở menu người dùng"
              onClick={() => setMenuOpen((value) => !value)}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.email ?? "User avatar"}
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                <User className="size-4" />
              )}
            </Button>
            {menuOpen ? (
              <div className="bg-background absolute right-0 mt-2 w-56 rounded-md border p-1 shadow-lg">
                <div className="px-3 py-2 text-xs text-muted-foreground">{user?.email ?? "Khách"}</div>
                {userMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm"
                    onClick={() => setMenuOpen(false)}
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                ))}
                <button
                  type="button"
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="size-4" />
          </Button>
        </div>
      </div>

      {open ? (
        <nav className="border-t md:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-2">
            <Button
              variant="outline"
              size="sm"
              className="mb-2 justify-start"
              onClick={handleSwitchRole}
              disabled={switchRoleMutation.isPending}
            >
              {switchRoleMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {switchRoleLabel}
            </Button>
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-2 py-2 text-sm transition-colors",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.title}
              </Link>
            ))}
            <div className="border-t pt-2">
              {userMenuItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm"
                  onClick={() => {
                    setOpen(false)
                    router.push(item.href)
                  }}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                className="hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-red-600"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                Đăng xuất
              </button>
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
