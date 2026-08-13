jest.mock("../../repositories/worker/worker-service.repository", () => ({
  workerServiceRepository: {
    findHashtagCandidates: jest.fn(),
    findAllForWorker: jest.fn(),
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
  },
}));

jest.mock("../../services/moderation", () => ({
  moderationService: {
    isProfileBlocked: jest.fn(),
    assertNoActiveRestriction: jest.fn(),
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
import { moderationService } from "../../services/moderation";
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

    expect(result.data).toHaveLength(2);
    expect(result.pagination).toMatchObject({ page: 2, limit: 2, total: 5 });
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
