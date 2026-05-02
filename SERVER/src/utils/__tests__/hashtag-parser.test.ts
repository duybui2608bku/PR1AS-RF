import { normalizeHashtagSlug, parseHashtags } from "../hashtag-parser";
import { HASHTAG_LIMITS } from "../../constants/hashtag";

describe("normalizeHashtagSlug", () => {
  it("lowercases and NFC-normalizes", () => {
    expect(normalizeHashtagSlug("PetCare")).toBe("petcare");
    expect(normalizeHashtagSlug("  ChămSócPet  ")).toBe("chămsócpet");
  });

  it("collapses internal whitespace into underscore", () => {
    expect(normalizeHashtagSlug("Pet Care Pro")).toBe("pet_care_pro");
  });
});

describe("parseHashtags", () => {
  it("returns empty array for empty / falsy input", () => {
    expect(parseHashtags("")).toEqual([]);
    expect(parseHashtags(undefined as unknown as string)).toEqual([]);
  });

  it("extracts a single hashtag at start of body", () => {
    expect(parseHashtags("#petcare hello")).toEqual([
      { slug: "petcare", display: "petcare" },
    ]);
  });

  it("extracts multiple hashtags and dedupes by slug (case-insensitive)", () => {
    const result = parseHashtags(
      "Hello #PetCare and again #petcare and #DogLover"
    );
    expect(result.map((t) => t.slug)).toEqual(["petcare", "doglover"]);
  });

  it("supports Vietnamese diacritics", () => {
    const result = parseHashtags("Yêu thú cưng #chămsócpet quá");
    expect(result).toEqual([{ slug: "chămsócpet", display: "chămsócpet" }]);
  });

  it("does not match hashtag inside the middle of a word (no leading whitespace)", () => {
    expect(parseHashtags("foo#bar")).toEqual([]);
  });

  it("caps at MAX_PER_POST", () => {
    const tags = Array.from({ length: HASHTAG_LIMITS.MAX_PER_POST + 5 })
      .map((_, i) => `#tag${i}`)
      .join(" ");
    const result = parseHashtags(tags);
    expect(result).toHaveLength(HASHTAG_LIMITS.MAX_PER_POST);
  });

  it("ignores hashtags longer than MAX_LENGTH", () => {
    const long = "x".repeat(HASHTAG_LIMITS.MAX_LENGTH + 1);
    const result = parseHashtags(`hello #${long} done`);
    expect(result).toEqual([]);
  });
});
