"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export const WorkerHashtagSearchBox = () => {
  const router = useRouter()
  const [q, setQ] = useState("")

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = q.trim()
    if (!trimmed) return
    router.push(`/workers/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Tìm worker theo hashtag (vd: it, hr)..."
        aria-label="Tìm worker theo hashtag"
      />
      <Button type="submit" size="icon" aria-label="Tìm">
        <Search className="size-4" aria-hidden="true" />
      </Button>
    </form>
  )
}
