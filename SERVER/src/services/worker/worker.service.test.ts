jest.mock("../../repositories/worker/worker-service.repository", () => ({
  workerServiceRepository: {
    searchWorkersByHashtag: jest.fn(),
  },
}));

import { workerService } from "./worker.service";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";

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
