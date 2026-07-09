"use client"

import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

type HashtagChipInputProps = {
  value: string[]
  onChange: (next: string[]) => void
  max?: number
  placeholder?: string
  disabled?: boolean
}

const DEFAULT_MAX = 10

// Mirror the server's normalization closely enough for a good preview; the
// server re-normalizes on save, so this only needs to be sensible.
const normalize = (raw: string): string =>
  raw
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^\p{L}\p{N}_]/gu, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")

export const HashtagChipInput = ({
  value,
  onChange,
  max = DEFAULT_MAX,
  placeholder,
  disabled,
}: HashtagChipInputProps) => {
  const [draft, setDraft] = useState("")

  const addTag = () => {
    const tag = normalize(draft)
    setDraft("")
    if (!tag || value.includes(tag) || value.length >= max) return
    onChange([...value, tag])
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      addTag()
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const handleRemove = (tag: string) => {
    onChange(value.filter((item) => item !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            #{tag}
            <button
              type="button"
              aria-label={`Xóa hashtag ${tag}`}
              onClick={() => handleRemove(tag)}
              disabled={disabled}
              className="rounded-full hover:text-destructive"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        disabled={disabled || value.length >= max}
        placeholder={
          value.length >= max
            ? `Tối đa ${max} hashtag`
            : (placeholder ?? "Nhập hashtag rồi Enter (vd: IT, HR)")
        }
      />
    </div>
  )
}
