import { SiteLayout } from "@/components/layout/site-layout"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("LegalResponsibility")
  return {
    title: t("title"),
  }
}

export default async function LegalResponsibilityPage() {
  const t = await getTranslations("LegalResponsibility")

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-3xl px-4 py-14 md:py-20">
        <h1 className="mb-1">{t("title")}</h1>
        <p className="mb-10 text-sm text-muted-foreground">{t("intro")}</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("principlesTitle")}
            </h2>
            <ol className="list-decimal space-y-2 pl-5">
              {(t.raw("principles") as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("dossierTitle")}
            </h2>
            <ol className="list-decimal space-y-2 pl-5">
              {(t.raw("dossier") as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}
