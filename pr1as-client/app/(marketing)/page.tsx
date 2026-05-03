import Link from "next/link"

import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"

export default function HomePage() {
  return (
    <section className="container-page section">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <span className="bg-secondary text-secondary-foreground rounded-full border px-3 py-1 text-xs font-medium">
          v0.0.1 · ready to build
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          Welcome to {siteConfig.name}
        </h1>
        <p className="text-muted-foreground text-pretty max-w-prose">
          {siteConfig.description} Boilerplate ships with shadcn/ui, TanStack Query, Axios, Zustand,
          dark mode, and a top progress bar on navigation.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard">Get started</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/about">Learn more</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
