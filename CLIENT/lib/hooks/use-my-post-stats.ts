"use client"

import { useQuery } from "@tanstack/react-query"
import { userProfileApi } from "../api/user.api"

export const useMyPostStats = (enabled = true) => {
  return useQuery({
    queryKey: ["posts", "stats", "me"],
    queryFn: () => userProfileApi.getMyPostStats(),
    enabled,
  })
}
