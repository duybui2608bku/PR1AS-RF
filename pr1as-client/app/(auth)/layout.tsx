import Link from "next/link"

import { siteConfig } from "@/config/site"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/20">
      <header className="border-b">
        <div className="container-page flex h-14 items-center">
          <Link href="/" className="font-semibold">
            {siteConfig.name}
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
