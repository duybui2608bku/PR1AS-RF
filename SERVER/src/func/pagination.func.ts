import { PAGINATION_DEFAULT } from "../constants/pagination";

export const getPagination = (page?: number, limit?: number) => {
  return {
    page: page ?? PAGINATION_DEFAULT.PAGE,
    limit: limit ?? PAGINATION_DEFAULT.LIMIT,
    skip:
      (page ?? PAGINATION_DEFAULT.PAGE - 1) *
      (limit ?? PAGINATION_DEFAULT.LIMIT),
  };
};
