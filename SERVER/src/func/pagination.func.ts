import { PAGINATION_DEFAULT } from "../constants/pagination";

export const getPagination = (page?: number, limit?: number) => {
  const finalPage = page && page > 0 ? page : PAGINATION_DEFAULT.PAGE;
  const finalLimit = limit && limit > 0 ? limit : PAGINATION_DEFAULT.LIMIT;

  return {
    page: finalPage,
    limit: finalLimit,
    skip: (finalPage - 1) * finalLimit,
  };
};
