"use client"

import NextTopLoader from "nextjs-toploader"

export function TopProgressBar() {
  return (
    <NextTopLoader
      color="var(--primary)"
      height={3}
      crawl
      crawlSpeed={200}
      speed={300}
      shadow="0 0 10px var(--primary),0 0 5px var(--primary)"
      showSpinner={false}
      easing="ease"
      zIndex={9999}
    />
  )
}
