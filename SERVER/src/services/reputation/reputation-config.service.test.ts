import { ReputationConfigService } from "./reputation-config.service";
import { reputationConfigRepository } from "../../repositories/reputation/reputation-config.repository";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";

jest.mock("../../repositories/reputation/reputation-config.repository", () => ({
  reputationConfigRepository: {
    findByKey: jest.fn(),
    upsert: jest.fn(),
    findAll: jest.fn(),
    seedDefaults: jest.fn(),
  },
}));

const repo = reputationConfigRepository as jest.Mocked<
  typeof reputationConfigRepository
>;

const KEY = ReputationConfigKey.JOB_COMPLETION_BONUS;

let service: ReputationConfigService;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  service = new ReputationConfigService();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("caching", () => {
  it("serves getValue from cache on a second call without re-querying the repository", async () => {
    repo.findByKey.mockResolvedValue({
      value: 7,
      active: true,
    } as never);

    const first = await service.getValue(KEY);
    const second = await service.getValue(KEY);

    expect(first).toBe(7);
    expect(second).toBe(7);
    expect(repo.findByKey).toHaveBeenCalledTimes(1);
  });

  it("re-queries the repository once the cache TTL (5 minutes) has expired", async () => {
    repo.findByKey.mockResolvedValue({ value: 7, active: true } as never);

    await service.getValue(KEY);
    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    await service.getValue(KEY);

    expect(repo.findByKey).toHaveBeenCalledTimes(2);
  });

  it("falls back to the built-in default value when no document exists in the DB", async () => {
    repo.findByKey.mockResolvedValue(null);

    const value = await service.getValue(KEY);

    expect(value).toBeGreaterThanOrEqual(0);
    expect(repo.findByKey).toHaveBeenCalledWith(KEY);
  });

  it("treats a legacy document missing the `active` field as active (only explicit false disables it)", async () => {
    repo.findByKey.mockResolvedValue({ value: 7 } as never);

    const active = await service.isActive(KEY);

    expect(active).toBe(true);
  });

  it("treats an explicit active: false as disabled", async () => {
    repo.findByKey.mockResolvedValue({ value: 7, active: false } as never);

    const active = await service.isActive(KEY);

    expect(active).toBe(false);
  });
});

describe("getActiveValue", () => {
  it("returns the value when the rule is active", async () => {
    repo.findByKey.mockResolvedValue({ value: 7, active: true } as never);

    expect(await service.getActiveValue(KEY)).toBe(7);
  });

  it("returns null when the rule is disabled, hiding the value from callers", async () => {
    repo.findByKey.mockResolvedValue({ value: 7, active: false } as never);

    expect(await service.getActiveValue(KEY)).toBeNull();
  });
});

describe("updateConfig", () => {
  it("invalidates only the updated key's cache entry so the next read reflects the change", async () => {
    repo.findByKey.mockResolvedValueOnce({ value: 7, active: true } as never);
    await service.getValue(KEY); // warm the cache

    repo.upsert.mockResolvedValue({
      key: KEY,
      value: 99,
      active: true,
    } as never);
    await service.updateConfig(KEY, { value: 99 }, "admin1");

    repo.findByKey.mockResolvedValueOnce({ value: 99, active: true } as never);
    const value = await service.getValue(KEY);

    expect(value).toBe(99);
    expect(repo.findByKey).toHaveBeenCalledTimes(2); // 1 warm-up + 1 post-invalidation
  });

  it("leaves other keys' cache entries untouched", async () => {
    const otherKey = ReputationConfigKey.FIVE_STAR_REVIEW_BONUS;
    repo.findByKey.mockResolvedValue({ value: 3, active: true } as never);
    await service.getValue(otherKey); // warm the cache for a different key

    repo.upsert.mockResolvedValue({ key: KEY, value: 99, active: true } as never);
    await service.updateConfig(KEY, { value: 99 }, "admin1");

    await service.getValue(otherKey);

    // Only the initial warm-up call for otherKey — the KEY update must not
    // have invalidated it.
    expect(repo.findByKey).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown config key", async () => {
    await expect(
      service.updateConfig("not_a_real_key" as ReputationConfigKey, { value: 1 }, "admin1")
    ).rejects.toThrow();
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("rejects when neither value nor active is provided", async () => {
    await expect(service.updateConfig(KEY, {}, "admin1")).rejects.toThrow();
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("rejects toggling `active` on a non-toggleable key", async () => {
    const nonToggleable = ReputationConfigKey.LOW_REVIEW_THRESHOLD;

    await expect(
      service.updateConfig(nonToggleable, { active: false }, "admin1")
    ).rejects.toThrow();
    expect(repo.upsert).not.toHaveBeenCalled();
  });
});
