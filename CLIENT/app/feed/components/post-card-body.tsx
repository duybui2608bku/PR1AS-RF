"use client"

import Link from "next/link"
import { Fragment } from "react"
import type { PostHashtag } from "@/lib/types/post"

const HASHTAG_REGEX = /(#[^\s#]+)/gu

interface PostCardBodyProps {
  body: string
  hashtags: PostHashtag[]
}

const buildSlugLookup = (hashtags: PostHashtag[]) => {
  const map = new Map<string, string>()
  for (const h of hashtags) {
    map.set(h.display.toLowerCase(), h.slug)
    map.set(h.slug.toLowerCase(), h.slug)
  }
  return map
}

export const PostCardBody = ({ body, hashtags }: PostCardBodyProps) => {
  const lookup = buildSlugLookup(hashtags)
  const parts = body.split(HASHTAG_REGEX)

  return (
    <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          const raw = part.slice(1)
          const slug =
            lookup.get(raw.toLowerCase()) ?? encodeURIComponent(raw)
          return (
            <Link
              key={`h-${i}`}
              href={`/feed?hashtag=${encodeURIComponent(slug)}`}
              style={{ fontWeight: 600, color: "var(--color-primary)" }}
            >
              {part}
            </Link>
          )
        }
        return <Fragment key={`t-${i}`}>{part}</Fragment>
      })}
    </p>
  )
}
