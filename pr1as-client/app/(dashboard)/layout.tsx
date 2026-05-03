import Link from "next/link"

import { siteConfig } from "@/config/site"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="container-page flex h-14 items-center justify-between">
          <Link href="/dashboard" className="font-semibold">
            {siteConfig.name} · Dashboard
          </Link>
        </div>
      </header>
      <div className="container-page flex flex-1 gap-6 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="text-muted-foreground flex flex-col gap-1 text-sm">
            <Link href="/dashboard" className="hover:text-foreground rounded-md px-2 py-1.5">
              Overview
            </Link>
            <Link href="/dashboard/settings" className="hover:text-foreground rounded-md px-2 py-1.5">
              Settings
            </Link>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
