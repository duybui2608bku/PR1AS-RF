import { buildWorkerProfileRoute } from "@/lib/constants/routes"

export const getAuthorWorkerHref = (author: {
  id: string
  has_worker_profile?: boolean
}): string | null =>
  author.has_worker_profile === true ? buildWorkerProfileRoute(author.id) : null
