import { Wrench } from "lucide-react"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("System.maintenance")
  return {
    title: `${t("title")} | PR1AS`,
    description: t("description"),
    robots: { index: false, follow: false },
  }
}

async function getMaintenanceMessage(): Promise<string> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3052/api"
    const res = await fetch(`${apiBase}/site-settings/maintenance`, {
      next: { revalidate: 30 },
    })
    if (!res.ok) return ""
    const json = (await res.json()) as { data?: { maintenanceMessage?: string } }
    return json.data?.maintenanceMessage ?? ""
  } catch {
    return ""
  }
}

export default async function MaintenancePage() {
  const t = await getTranslations("System.maintenance")
  const message = await getMaintenanceMessage()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
            <Wrench className="size-10 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            PR1AS
          </p>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        </div>
        <p className="text-base text-muted-foreground leading-relaxed">
          {message || t("description")}
        </p>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{t("patience")}</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <p className="text-xs text-muted-foreground">
          {t("emergency")}{" "}
          <a
            href="mailto:pr1as.connect@gmail.com"
            className="text-primary underline underline-offset-4 hover:no-underline"
          >
            pr1as.connect@gmail.com
          </a>
        </p>
      </div>
    </div>
  )
}
