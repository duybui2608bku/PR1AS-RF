jest.mock(
  "../../repositories/worker-question/worker-question.repository",
  () => ({
    workerQuestionRepository: {
      findById: jest.fn(),
      hide: jest.fn(),
    },
  })
);

jest.mock("../notification", () => ({
  notificationEventService: {},
}));

import { Types } from "mongoose";
import { workerQuestionRepository } from "../../repositories/worker-question/worker-question.repository";
import { workerQuestionService } from "./worker-question.service";

const repo = workerQuestionRepository as jest.Mocked<
  typeof workerQuestionRepository
>;

const workerId = new Types.ObjectId().toString();
const askerId = new Types.ObjectId().toString();
const questionId = new Types.ObjectId().toString();

const mockQuestion = (overrides: Record<string, unknown> = {}) =>
  repo.findById.mockResolvedValue({
    worker_id: new Types.ObjectId(workerId),
    asker_id: new Types.ObjectId(askerId),
    is_hidden: false,
    ...overrides,
  } as never);

describe("WorkerQuestionService.deleteQuestion", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ["the worker being asked", workerId],
    ["the asker", askerId],
  ])("lets %s delete the question", async (_label, userId) => {
    mockQuestion();
    await workerQuestionService.deleteQuestion(questionId, userId);
    expect(repo.hide).toHaveBeenCalledWith(questionId);
  });

  it("forbids anyone else", async () => {
    mockQuestion();
    await expect(
      workerQuestionService.deleteQuestion(
        questionId,
        new Types.ObjectId().toString()
      )
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repo.hide).not.toHaveBeenCalled();
  });

  it("forbids a stranger on a guest question (asker_id null)", async () => {
    mockQuestion({ asker_id: null });
    await expect(
      workerQuestionService.deleteQuestion(
        questionId,
        new Types.ObjectId().toString()
      )
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("404s on an already-deleted question", async () => {
    mockQuestion({ is_hidden: true });
    await expect(
      workerQuestionService.deleteQuestion(questionId, workerId)
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
