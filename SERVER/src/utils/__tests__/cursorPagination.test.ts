import {
  buildCursorFilter,
  decodeCursor,
  encodeCursor,
  formatCursorResponse,
} from "../cursorPagination";
import { AppError } from "../AppError";

describe("encodeCursor / decodeCursor", () => {
  it("round-trips a cursor value", () => {
    const value = {
      createdAt: new Date("2025-12-31T10:11:12.345Z"),
      id: "abc123",
    };
    const cursor = encodeCursor(value);
    const decoded = decodeCursor(cursor);
    expect(decoded.id).toBe(value.id);
    expect(decoded.createdAt.toISOString()).toBe(value.createdAt.toISOString());
  });

  it("produces URL-safe output (no '+' or '/')", () => {
    const value = { createdAt: new Date(), id: "x".repeat(40) };
    const cursor = encodeCursor(value);
    expect(cursor).not.toMatch(/[+/=]/);
  });

  it("throws AppError on malformed cursor", () => {
    expect(() => decodeCursor("not-base64!!!")).toThrow(AppError);
    expect(() => decodeCursor("")).toThrow(AppError);
    expect(() => decodeCursor(Buffer.from("{}").toString("base64url"))).toThrow(
      AppError
    );
  });
});

describe("buildCursorFilter", () => {
  it("builds a strict-less-than filter on (created_at, _id)", () => {
    const cursor = { createdAt: new Date("2025-01-01"), id: "abc" };
    const filter = buildCursorFilter(cursor);
    expect(filter).toEqual({
      $or: [
        { created_at: { $lt: cursor.createdAt } },
        { created_at: cursor.createdAt, _id: { $lt: "abc" } },
      ],
    });
  });
});

describe("formatCursorResponse", () => {
  type Item = { id: string; created_at: Date };
  const getCursor = (item: Item) => ({
    createdAt: item.created_at,
    id: item.id,
  });

  it("returns has_more=false when items length <= limit", () => {
    const items: Item[] = [
      { id: "1", created_at: new Date("2025-01-01") },
      { id: "2", created_at: new Date("2025-01-02") },
    ];
    const result = formatCursorResponse(items, 5, getCursor);
    expect(result.has_more).toBe(false);
    expect(result.next_cursor).toBeNull();
    expect(result.data).toHaveLength(2);
  });

  it("returns has_more=true and slices when items length > limit", () => {
    const items: Item[] = [
      { id: "1", created_at: new Date("2025-01-01") },
      { id: "2", created_at: new Date("2025-01-02") },
      { id: "3", created_at: new Date("2025-01-03") },
    ];
    const result = formatCursorResponse(items, 2, getCursor);
    expect(result.has_more).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.next_cursor).not.toBeNull();
    const decoded = decodeCursor(result.next_cursor as string);
    expect(decoded.id).toBe("2");
  });
});
