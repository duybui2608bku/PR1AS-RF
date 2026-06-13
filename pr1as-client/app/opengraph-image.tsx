import { ImageResponse } from "next/og"
import { getTranslations } from "next-intl/server"

import { siteConfig } from "@/config/site"

export const runtime = "edge"
export const alt = "PR1AS"
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"

export default async function Image() {
  const t = await getTranslations("System.og")

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#09090b",
        color: "#fafafa",
        padding: 72,
      }}
    >
      <div
        style={{
          fontSize: 28,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "#a7f3d0",
        }}
      >
        {siteConfig.name}
      </div>
      <div
        style={{
          marginTop: 28,
          maxWidth: 900,
          fontSize: 72,
          fontWeight: 700,
          lineHeight: 1.05,
        }}
      >
        {t("title")}
      </div>
      <div
        style={{
          marginTop: 32,
          maxWidth: 820,
          fontSize: 30,
          lineHeight: 1.35,
          color: "#d4d4d8",
        }}
      >
        {t("subtitle")}
      </div>
    </div>,
    size
  )
}
