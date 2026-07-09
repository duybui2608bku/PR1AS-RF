import { normalizeHashtag, normalizeHashtags } from "./worker-hashtag";

describe("normalizeHashtag", () => {
  it("strips a leading #, lowercases, and trims", () => {
    expect(normalizeHashtag("  #IT ")).toBe("it");
  });

  it("converts spaces and hyphens to a single underscore", () => {
    expect(normalizeHashtag("IT  support")).toBe("it_support");
    expect(normalizeHashtag("front-end")).toBe("front_end");
  });

  it("drops disallowed characters and trims underscores", () => {
    expect(normalizeHashtag("__C#/++__")).toBe("c");
  });

  it("keeps unicode letters and digits", () => {
    expect(normalizeHashtag("Kế_toán2")).toBe("kế_toán2");
  });

  it("returns null for empty-after-cleaning input", () => {
    expect(normalizeHashtag("  ###  ")).toBeNull();
    expect(normalizeHashtag("")).toBeNull();
  });

  it("returns null when longer than MAX_LENGTH (50)", () => {
    expect(normalizeHashtag("a".repeat(51))).toBeNull();
    expect(normalizeHashtag("a".repeat(50))).toBe("a".repeat(50));
  });
});

describe("normalizeHashtags", () => {
  it("normalizes, drops nulls, and dedupes preserving order", () => {
    expect(normalizeHashtags(["IT", "#it", "HR", " hr "])).toEqual([
      "it",
      "hr",
    ]);
  });

  it("caps the result at MAX_PER_SERVICE (10)", () => {
    const input = Array.from({ length: 15 }, (_, i) => `tag${i}`);
    expect(normalizeHashtags(input)).toHaveLength(10);
  });

  it("returns an empty array for empty input", () => {
    expect(normalizeHashtags([])).toEqual([]);
  });
});
