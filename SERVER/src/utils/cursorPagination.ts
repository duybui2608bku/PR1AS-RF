import { AppError } from "./AppError";
import { COMMON_MESSAGES } from "../constants/messages";

export interface CursorValue {
  createdAt: Date;
  id: string;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  next_cursor: string | null;
  has_more: boolean;
}

/**
 * Encode a cursor as a URL-safe base64 string of `{ createdAt, id }`.
 * The cursor uniquely identifies a feed position so subsequent requests can
 * resume after the last item without using offset/skip (constant-cost paging).
 */
export const encodeCursor = (value: CursorValue): string => {
  const payload = JSON.stringify({
    createdAt: value.createdAt.toISOString(),
    id: value.id,
  });
  return Buffer.from(payload, "utf8").toString("base64url");
};

/**
 * Decode the cursor produced by `encodeCursor`. Throws a 400 AppError when
 * the cursor is malformed so the controller surfaces a friendly error.
 */
export const decodeCursor = (cursor: string): CursorValue => {
  try {
    const payload = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(payload) as {
      createdAt?: string;
      id?: string;
    };
    if (!parsed.createdAt || !parsed.id) {
      throw new Error("missing fields");
    }
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("invalid date");
    }
    return { createdAt, id: parsed.id };
  } catch {
    throw AppError.badRequest(COMMON_MESSAGES.BAD_REQUEST, [
      { field: "cursor", message: "Invalid cursor" },
    ]);
  }
};

/**
 * Build a Mongo `$or` filter that returns documents strictly older than the
 * cursor (descending feed). Pair with `.sort({ created_at: -1, _id: -1 })`.
 */
export const buildCursorFilter = (
  cursor: CursorValue
): Record<string, unknown> => {
  return {
    $or: [
      { created_at: { $lt: cursor.createdAt } },
      { created_at: cursor.createdAt, _id: { $lt: cursor.id } },
    ],
  };
};

/**
 * Format a list of items into a cursor-paginated response.
 *
 * Convention: the caller queries `limit + 1` items so we can detect whether a
 * next page exists without an extra count query.
 */
export const formatCursorResponse = <T>(
  items: T[],
  limit: number,
  getCursor: (item: T) => CursorValue
): CursorPaginatedResponse<T> => {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const last = data[data.length - 1];
  const nextCursor = hasMore && last ? encodeCursor(getCursor(last)) : null;
  return {
    data,
    next_cursor: nextCursor,
    has_more: hasMore,
  };
};
