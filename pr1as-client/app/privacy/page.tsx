import { SiteLayout } from "@/components/layout/site-layout"
import { getTranslations } from "next-intl/server"

export async function generateMetadata() {
  const t = await getTranslations("Privacy")
  return {
    title: t("title"),
  }
}

export default async function PrivacyPage() {
  const t = await getTranslations("Privacy")

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-3xl px-4 py-14 md:py-20">
        <h1 className="mb-2">{t("title")}</h1>
        <p className="mb-10 text-sm text-muted-foreground">{t("lastUpdated")}</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("section1.title")}
            </h2>
            <p>{t("section1.content")}</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("section2.title")}
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              {(t.raw("section2.items") as string[]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("section3.title")}
            </h2>
            <p>{t("section3.content")}</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("section4.title")}
            </h2>
            <p>{t("section4.content")}</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("section5.title")}
            </h2>
            <p>{t("section5.content")}</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("section6.title")}
            </h2>
            <p>{t("section6.content")}</p>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("section7.title")}
            </h2>
            <p>{t("section7.content")}</p>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}
