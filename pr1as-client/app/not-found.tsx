import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[60svh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Page not found</h1>
      <p className="text-muted-foreground max-w-md">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been moved or deleted.
      </p>
      <div className="mt-2 flex gap-2">
        <Link href="/" className={buttonVariants()}>
          Back to home
        </Link>
        <Link href="/contact" className={buttonVariants({ variant: "outline" })}>
          Contact support
        </Link>
      </div>
    </div>
  )
}
