export type Paginated<T> = {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export type ApiResponse<T> = {
  data: T
  message?: string
  success: boolean
}

export type Nullable<T> = T | null
export type Maybe<T> = T | null | undefined
