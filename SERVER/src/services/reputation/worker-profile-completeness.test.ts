import { computeProfileCompletenessScore } from "./worker-profile-completeness";
import { WorkerProfile, gender } from "../../types/auth/user.types";

const CONFIG = { photoBonus: 10, minPhotos: 5, perFieldBonus: 5 };

const emptyProfile: WorkerProfile = {
  gender: gender.OTHER,
  hobbies: [],
  gallery_urls: [],
};

describe("computeProfileCompletenessScore", () => {
  it("scores 0 for a completely empty profile", () => {
    expect(computeProfileCompletenessScore(null, CONFIG)).toBe(0);
    expect(computeProfileCompletenessScore(emptyProfile, CONFIG)).toBe(0);
  });

  it("awards the photo bonus only once the gallery meets the threshold", () => {
    const under = {
      ...emptyProfile,
      gallery_urls: ["a", "b", "c", "d"],
    };
    const atThreshold = {
      ...emptyProfile,
      gallery_urls: ["a", "b", "c", "d", "e"],
    };
    expect(computeProfileCompletenessScore(under, CONFIG)).toBe(0);
    expect(computeProfileCompletenessScore(atThreshold, CONFIG)).toBe(10);
  });

  it("awards 5 points per filled info field, out of 10 possible fields", () => {
    const profile: WorkerProfile = {
      ...emptyProfile,
      introduction: "hi",
      date_of_birth: new Date("2000-01-01"),
      height_cm: 170,
      weight_kg: 60,
      star_sign: "Leo",
      occupation: "Photographer",
      lifestyle: "Active",
      hobbies: ["reading"],
      personality: "Cheerful",
      marital_status: "single",
    };
    expect(computeProfileCompletenessScore(profile, CONFIG)).toBe(50);
  });

  it("caps total at photo bonus + all 10 fields (60)", () => {
    const full: WorkerProfile = {
      gender: gender.OTHER,
      introduction: "hi",
      date_of_birth: new Date("2000-01-01"),
      height_cm: 170,
      weight_kg: 60,
      star_sign: "Leo",
      occupation: "Photographer",
      lifestyle: "Active",
      hobbies: ["reading"],
      personality: "Cheerful",
      marital_status: "single",
      gallery_urls: ["a", "b", "c", "d", "e", "f"],
    };
    expect(computeProfileCompletenessScore(full, CONFIG)).toBe(60);
  });

  it("does not count an empty string or empty array as filled", () => {
    const profile: WorkerProfile = {
      ...emptyProfile,
      introduction: "",
      hobbies: [],
    };
    expect(computeProfileCompletenessScore(profile, CONFIG)).toBe(0);
  });
});
