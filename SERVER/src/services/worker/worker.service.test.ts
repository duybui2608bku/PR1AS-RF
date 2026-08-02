jest.mock("../../repositories/worker/worker-service.repository", () => ({
  workerServiceRepository: {
    searchWorkersByHashtag: jest.fn(),
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

import { workerService } from "./worker.service";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { reviewRepository } from "../../repositories/review/review.repository";
import { moderationService } from "../../services/moderation";

describe("workerService.searchByHashtag", () => {
  beforeEach(() => jest.clearAllMocks());

  it("normalizes the query and passes skip/limit, returning paginated cards", async () => {
    (
      workerServiceRepository.searchWorkersByHashtag as jest.Mock
    ).mockResolvedValue({
      data: [{ id: "w1", matched_hashtags: ["it"] }],
      total: 1,
    });

    const result = await workerService.searchByHashtag("#IT", 1, 20);

    expect(workerServiceRepository.searchWorkersByHashtag).toHaveBeenCalledWith(
      "it",
      0,
      20
    );
    expect(result.data).toHaveLength(1);
    expect(result.pagination).toMatchObject({ page: 1, limit: 20, total: 1 });
  });

  it("returns an empty page without hitting the repo when the query normalizes to empty", async () => {
    const result = await workerService.searchByHashtag("###", 1, 20);

    expect(
      workerServiceRepository.searchWorkersByHashtag
    ).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});

describe("workerService.getWorkerById", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the worker's real reputation_score in the detail response", async () => {
    const workerId = "worker-123";
    const userId = { toString: () => workerId };

    (moderationService.isProfileBlocked as jest.Mock).mockResolvedValue(false);
    (
      moderationService.assertNoActiveRestriction as jest.Mock
    ).mockResolvedValue(undefined);
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
    (workerServiceRepository.findAllForWorker as jest.Mock).mockResolvedValue(
      []
    );
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
