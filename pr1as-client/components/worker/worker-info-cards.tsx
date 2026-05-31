import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { WorkerProfilePublic } from "@/types"

type Props = {
  profile: WorkerProfilePublic | null
}

export function WorkerInfoCards({ profile }: Props) {
  return (
    <div className="hidden grid-cols-1 gap-3 sm:grid-cols-2 lg:grid">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Lifestyle</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {profile?.lifestyle?.trim() || "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">Quote</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm italic whitespace-pre-line text-muted-foreground">
            {profile?.quote ? `“${profile.quote}”` : "—"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
