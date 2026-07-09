"use client"

import { Suspense, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { useWorkerHashtagSearch } from "@/lib/hooks/use-worker-hashtag-search"

const WorkerHashtagSearch = () => {
  const searchParams = useSearchParams()
  const [q, setQ] = useState(searchParams.get("q") ?? "")
  const { data, isLoading, isFetching } = useWorkerHashtagSearch(q)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQ(event.target.value)
  }

  const results = data?.data ?? []
  const hasQuery = q.trim().length > 0

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Tìm worker theo hashtag</h1>
        <Input
          value={q}
          onChange={handleChange}
          placeholder="Nhập hashtag (vd: it, hr)..."
          aria-label="Tìm theo hashtag"
        />
      </header>

      {hasQuery && (isLoading || isFetching) ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin" aria-label="Đang tải" />
        </div>
      ) : null}

      {hasQuery && !isLoading && results.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Không tìm thấy worker nào với hashtag này.
        </p>
      ) : null}

      <ul className="space-y-3">
        {results.map((worker) => (
          <li key={worker.id}>
            <Link
              href={`/worker/${worker.id}`}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              {worker.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={worker.avatar}
                  alt={worker.full_name ?? "Worker"}
                  className="size-12 rounded-full object-cover"
                />
              ) : (
                <div className="size-12 rounded-full bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {worker.full_name ?? "Worker"}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {worker.matched_hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

const WorkerHashtagSearchPage = () => (
  <Suspense
    fallback={
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Đang tải" />
      </div>
    }
  >
    <WorkerHashtagSearch />
  </Suspense>
)

export default WorkerHashtagSearchPage
