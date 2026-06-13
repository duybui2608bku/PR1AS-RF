import Link from "next/link"
import { getTranslations } from "next-intl/server"

import { buttonVariants } from "@/components/ui/button"
import { siteConfig } from "@/config/site"

export default async function NotFound() {
  const t = await getTranslations("System")

  return (
    <div className="container mx-auto flex min-h-[60svh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-muted-foreground text-sm font-medium">404</p>
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {t("notFoundTitle")}
      </h1>
      <p className="text-muted-foreground max-w-md">
        {t("notFoundDescription")}
      </p>
      <div className="mt-2 flex gap-2">
        <Link href="/" className={buttonVariants()}>
          {t("backToHome")}
        </Link>
        <Link
          href={`mailto:${siteConfig.contactEmail}`}
          className={buttonVariants({ variant: "outline" })}
        >
          {t("contactSupport")}
        </Link>
      </div>
    </div>
  )
}
