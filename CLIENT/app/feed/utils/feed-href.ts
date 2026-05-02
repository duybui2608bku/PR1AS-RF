export const buildFeedTabAllHref = (
  basePath: string,
  searchParams: URLSearchParams
): string => {
  const next = new URLSearchParams(searchParams.toString())
  next.delete("tab")
  const qs = next.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

export const buildFeedTabMineHref = (
  basePath: string,
  searchParams: URLSearchParams
): string => {
  const next = new URLSearchParams(searchParams.toString())
  next.set("tab", "mine")
  return `${basePath}?${next.toString()}`
}

export const buildFeedClearHashtagHref = (
  basePath: string,
  searchParams: URLSearchParams
): string => {
  const next = new URLSearchParams(searchParams.toString())
  next.delete("hashtag")
  const qs = next.toString()
  return qs ? `${basePath}?${qs}` : basePath
}
