jest.mock("../../repositories/worker/worker-service.repository", () => ({
  workerServiceRepository: {
    findHashtagCandidates: jest.fn(),
    findAllForWorker: jest.fn(),
    findWorkersGroupedByService: jest.fn(),
  },
}));

jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: {
    findById: jest.fn(),
  },
}));

jest.mock("../../repositories/review/review.repository", () => ({
  reviewRepository: {
    getStatsByWorkerId: jest.fn(),
    findByWorkerId: jest.fn(),
    getAverageRatingsForWorkers: jest.fn(),
  },
}));

jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: {
    getCompletedCountsForWorkers: jest.fn(),
    findConflictsForWorkersInWindow: jest.fn(),
  },
}));

jest.mock("../../services/moderation", () => ({
  moderationService: {
    isProfileBlocked: jest.fn(),
    assertNoActiveRestriction: jest.fn(),
    getProfileBlockedIds: jest.fn(),
  },
}));

jest.mock("../../repositories/moderation", () => ({
  moderationRepository: {
    getActiveRestrictedUserIds: jest.fn(),
  },
}));

jest.mock("../../repositories/boost/worker-boost.repository", () => ({
  workerBoostRepository: {
    findActiveBoostsForWorkers: jest.fn(),
  },
}));

jest.mock("../../repositories/boost/boost-config.repository", () => ({
  boostConfigRepository: {
    get: jest.fn(),
  },
}));

jest.mock("../../config/socket.handlers", () => ({
  isUserOnlineBulk: jest.fn(),
}));

import { workerService } from "./worker.service";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { reviewRepository } from "../../repositories/review/review.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { moderationService } from "../../services/moderation";
import { moderationRepository } from "../../repositories/moderation";
import { workerBoostRepository } from "../../repositories/boost/worker-boost.repository";
import { boostConfigRepository } from "../../repositories/boost/boost-config.repository";
import { isUserOnlineBulk } from "../../config/socket.handlers";

const stubNoBoostNoOnline = () => {
  (workerBoostRepository.findActiveBoostsForWorkers as jest.Mock).mockResolvedValue(
    []
  );
  (boostConfigRepository.get as jest.Mock).mockResolvedValue({
    rotation_interval_minutes: 30,
  });
  (isUserOnlineBulk as jest.Mock).mockReturnValue(new Set());
};

const candidate = (overrides: Record<string, unknown> & { id: string }) => ({
  full_name: null,
  avatar: null,
  worker_profile: null,
  reputation_score: 100,
  average_rating: 0,
  completed_bookings: 0,
  created_at: new Date("2026-01-01T00:00:00Z"),
  matched_hashtags: ["it"],
  ...overrides,
});

const stubNoModerationRestrictions = () => {
  (moderationService.getProfileBlockedIds as jest.Mock).mockResolvedValue([]);
  (
    moderationRepository.getActiveRestrictedUserIds as jest.Mock
  ).mockResolvedValue([]);
};

const groupedWorker = (
  overrides: Record<string, unknown> & { id: string }
) => ({
  full_name: null,
  avatar: null,
  worker_profile: null,
  reputation_score: 100,
  last_active_at: null,
  created_at: new Date("2026-01-01T00:00:00Z"),
  pricing: [],
  ...overrides,
});

const groupedService = (overrides: Record<string, unknown> = {}) => ({
  id: "service-1",
  code: "MASSAGE",
  name: { en: "Massage", vi: "Massage" },
  description: { en: "desc", vi: "desc" },
  category: "WELLNESS",
  ...overrides,
});

describe("workerService.getWorkersGroupedByService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("ranks a boosted worker ahead of a higher-merit unboosted worker, attaches boost/presence, and strips ranking-only fields", async () => {
    (
      workerServiceRepository.findWorkersGroupedByService as jest.Mock
    ).mockResolvedValue([
      {
        service: groupedService(),
        workers: [
          groupedWorker({ id: "w-plain" }),
          groupedWorker({ id: "w-boosted" }),
        ],
      },
    ]);
    stubNoModerationRestrictions();
    (
      workerBoostRepository.findActiveBoostsForWorkers as jest.Mock
    ).mockResolvedValue([
      { user_id: "w-boosted", tier: 1, expires_at: new Date("2099-01-01") },
    ]);
    (boostConfigRepository.get as jest.Mock).mockResolvedValue({
      rotation_interval_minutes: 30,
    });
    (isUserOnlineBulk as jest.Mock).mockReturnValue(new Set());
    (
      reviewRepository.getAverageRatingsForWorkers as jest.Mock
    ).mockResolvedValue(
      new Map([
        ["w-plain", 5],
        ["w-boosted", 0],
      ])
    );
    (
      bookingRepository.getCompletedCountsForWorkers as jest.Mock
    ).mockResolvedValue(
      new Map([
        ["w-plain", 999],
        ["w-boosted", 0],
      ])
    );

    const result = await workerService.getWorkersGroupedByService({});

    // Boost tier outranks completed_bookings/average_rating even though
    // w-plain has far higher merit stats than w-boosted.
    expect(result[0].workers.map((w) => w.id)).toEqual([
      "w-boosted",
      "w-plain",
    ]);
    expect(result[0].workers[0].boost).toEqual({
      is_boosted: true,
      boost_type: "featured",
      boost_tier: 1,
    });
    expect(result[0].workers[0].presence).toEqual({
      is_online: false,
      last_active_at: null,
    });
    for (const worker of result[0].workers) {
      expect(worker).not.toHaveProperty("average_rating");
      expect(worker).not.toHaveProperty("completed_bookings");
      expect(worker).not.toHaveProperty("created_at");
    }
  });

  it("ranks a newly-created worker ahead of an older one when every other stat is tied", async () => {
    (
      workerServiceRepository.findWorkersGroupedByService as jest.Mock
    ).mockResolvedValue([
      {
        service: groupedService(),
        workers: [
          groupedWorker({ id: "w-old", created_at: new Date("2020-01-01") }),
          groupedWorker({ id: "w-new", created_at: new Date("2026-08-01") }),
        ],
      },
    ]);
    stubNoModerationRestrictions();
    (
      workerBoostRepository.findActiveBoostsForWorkers as jest.Mock
    ).mockResolvedValue([]);
    (boostConfigRepository.get as jest.Mock).mockResolvedValue({
      rotation_interval_minutes: 30,
    });
    (isUserOnlineBulk as jest.Mock).mockReturnValue(new Set());
    (
      reviewRepository.getAverageRatingsForWorkers as jest.Mock
    ).mockResolvedValue(new Map());
    (
      bookingRepository.getCompletedCountsForWorkers as jest.Mock
    ).mockResolvedValue(new Map());

    const result = await workerService.getWorkersGroupedByService({});

    expect(result[0].workers.map((w) => w.id)).toEqual(["w-new", "w-old"]);
  });

  it("filters out a worker with no schedule-free duration when a schedule is requested", async () => {
    const scheduleAt = new Date("2026-08-20T09:00:00Z");
    (
      workerServiceRepository.findWorkersGroupedByService as jest.Mock
    ).mockResolvedValue([
      {
        service: groupedService(),
        workers: [
          groupedWorker({
            id: "w-busy",
            pricing: [{ duration: 60, price: 100, unit: "session" }],
          }),
          groupedWorker({
            id: "w-free",
            pricing: [{ duration: 60, price: 100, unit: "session" }],
          }),
        ],
      },
    ]);
    stubNoModerationRestrictions();
    (
      workerBoostRepository.findActiveBoostsForWorkers as jest.Mock
    ).mockResolvedValue([]);
    (boostConfigRepository.get as jest.Mock).mockResolvedValue({
      rotation_interval_minutes: 30,
    });
    (isUserOnlineBulk as jest.Mock).mockReturnValue(new Set());
    (
      reviewRepository.getAverageRatingsForWorkers as jest.Mock
    ).mockResolvedValue(new Map());
    (
      bookingRepository.getCompletedCountsForWorkers as jest.Mock
    ).mockResolvedValue(new Map());
    (
      bookingRepository.findConflictsForWorkersInWindow as jest.Mock
    ).mockResolvedValue([
      {
        worker_id: "w-busy",
        start_time: new Date("2026-08-20T09:00:00Z"),
        end_time: new Date("2026-08-20T10:00:00Z"),
      },
    ]);

    const result = await workerService.getWorkersGroupedByService({
      schedule: scheduleAt,
    });

    expect(result).toHaveLength(1);
    expect(result[0].workers.map((w) => w.id)).toEqual(["w-free"]);
  });
});

describe("workerService.searchByHashtag", () => {
  beforeEach(() => jest.clearAllMocks());

  it("normalizes the query, ranks candidates newest-first when tied, and strips ranking fields", async () => {
    (workerServiceRepository.findHashtagCandidates as jest.Mock).mockResolvedValue([
      candidate({ id: "w-old", created_at: new Date("2025-01-01T00:00:00Z") }),
      candidate({ id: "w-new", created_at: new Date("2026-08-01T00:00:00Z") }),
    ]);
    stubNoBoostNoOnline();

    const result = await workerService.searchByHashtag("#IT", 1, 20);

    expect(workerServiceRepository.findHashtagCandidates).toHaveBeenCalledWith("it");
    expect(result.data.map((w) => w.id)).toEqual(["w-new", "w-old"]);
    expect(result.data[0]).not.toHaveProperty("average_rating");
    expect(result.data[0]).not.toHaveProperty("completed_bookings");
    expect(result.data[0]).not.toHaveProperty("created_at");
    expect(result.pagination).toMatchObject({ page: 1, limit: 20, total: 2 });
  });

  it("returns an empty page without hitting the repo when the query normalizes to empty", async () => {
    const result = await workerService.searchByHashtag("###", 1, 20);

    expect(workerServiceRepository.findHashtagCandidates).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it("slices the ranked candidates for the requested page", async () => {
    const candidates = Array.from({ length: 5 }, (_, i) =>
      candidate({ id: `w-${i}`, created_at: new Date(2026, 0, i + 1) })
    );
    (workerServiceRepository.findHashtagCandidates as jest.Mock).mockResolvedValue(
      candidates
    );
    stubNoBoostNoOnline();

    const result = await workerService.searchByHashtag("#it", 2, 2);

    // All candidates are tied on every key except created_at, so the ranked
    // order is newest-first: w-4, w-3, w-2, w-1, w-0. Page 2 with limit 2
    // means skip=2, so items at index 2,3 => w-2, w-1.
    expect(result.data.map((w) => w.id)).toEqual(["w-2", "w-1"]);
    expect(result.pagination).toMatchObject({ page: 2, limit: 2, total: 5 });
  });

  it("returns a partial page when fewer candidates remain than the limit", async () => {
    const candidates = Array.from({ length: 5 }, (_, i) =>
      candidate({ id: `w-${i}`, created_at: new Date(2026, 0, i + 1) })
    );
    (workerServiceRepository.findHashtagCandidates as jest.Mock).mockResolvedValue(
      candidates
    );
    stubNoBoostNoOnline();

    const result = await workerService.searchByHashtag("#it", 3, 2);

    // Page 3 with limit 2 means skip=4; only index 4 remains => w-0.
    expect(result.data.map((w) => w.id)).toEqual(["w-0"]);
    expect(result.pagination).toMatchObject({ page: 3, limit: 2, total: 5 });
  });

  it("returns an empty page when requesting past the end of the results", async () => {
    const candidates = Array.from({ length: 5 }, (_, i) =>
      candidate({ id: `w-${i}`, created_at: new Date(2026, 0, i + 1) })
    );
    (workerServiceRepository.findHashtagCandidates as jest.Mock).mockResolvedValue(
      candidates
    );
    stubNoBoostNoOnline();

    const result = await workerService.searchByHashtag("#it", 99, 2);

    expect(result.data).toEqual([]);
    expect(result.pagination).toMatchObject({ page: 99, limit: 2, total: 5 });
  });
});

describe("workerService.getWorkerById", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the worker's real reputation_score in the detail response", async () => {
    const workerId = "worker-123";
    const userId = { toString: () => workerId };

    (moderationService.isProfileBlocked as jest.Mock).mockResolvedValue(false);
    (moderationService.assertNoActiveRestriction as jest.Mock).mockResolvedValue(
      undefined
    );
    (userRepository.findById as jest.Mock).mockResolvedValue({
      _id: userId,
      full_name: "John Worker",
      avatar: "https://example.com/avatar.jpg",
      email: "john@example.com",
      meta_data: {
        reputation_score: 42,
      },
      worker_profile: {
        introduction: "I am a great worker",
        gallery_urls: [],
        work_locations: [],
      },
      coords: undefined,
    });
    (workerServiceRepository.findAllForWorker as jest.Mock).mockResolvedValue([]);
    (reviewRepository.getStatsByWorkerId as jest.Mock).mockResolvedValue({
      total: 0,
      average: 0,
    });
    (reviewRepository.findByWorkerId as jest.Mock).mockResolvedValue({
      reviews: [],
    });

    const result = await workerService.getWorkerById(workerId);

    expect(result.user.meta_data.reputation_score).toBe(42);
  });
});
