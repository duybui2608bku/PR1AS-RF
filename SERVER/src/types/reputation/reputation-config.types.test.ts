import {
  REPUTATION_CONFIG_DEFAULTS,
  ReputationConfigKey,
  TOGGLEABLE_REPUTATION_KEYS,
} from "./reputation-config.types";

describe("reputation config defaults", () => {
  it("has a default entry for every enum key", () => {
    for (const key of Object.values(ReputationConfigKey)) {
      expect(REPUTATION_CONFIG_DEFAULTS[key]).toBeDefined();
      expect(typeof REPUTATION_CONFIG_DEFAULTS[key].value).toBe("number");
    }
  });

  it("marks the new worker scoring keys as toggleable, thresholds as not", () => {
    expect(
      TOGGLEABLE_REPUTATION_KEYS.has(ReputationConfigKey.PROFILE_PHOTOS_BONUS)
    ).toBe(true);
    expect(
      TOGGLEABLE_REPUTATION_KEYS.has(
        ReputationConfigKey.PROFILE_INFO_FIELD_BONUS
      )
    ).toBe(true);
    expect(
      TOGGLEABLE_REPUTATION_KEYS.has(ReputationConfigKey.CANCEL_NOSHOW_PENALTY)
    ).toBe(true);
    expect(
      TOGGLEABLE_REPUTATION_KEYS.has(
        ReputationConfigKey.MIN_PROFILE_PHOTOS_THRESHOLD
      )
    ).toBe(false);
  });

  it("raises the low-review deduction default from 5 to 10", () => {
    expect(
      REPUTATION_CONFIG_DEFAULTS[ReputationConfigKey.LOW_REVIEW_DEDUCTION]
        .value
    ).toBe(10);
  });
});
