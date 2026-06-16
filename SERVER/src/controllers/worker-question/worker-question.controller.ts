import { Response } from "express";
import { workerQuestionService } from "../../services/worker-question/worker-question.service";
import {
  createWorkerQuestionSchema,
  answerWorkerQuestionSchema,
  listWorkerQuestionsQuerySchema,
} from "../../validations/worker-question/worker-question.validation";
import { WORKER_QUESTION_MESSAGES } from "../../constants/worker-question";
import { COMMON_MESSAGES } from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import { extractUserIdFromRequest, R, validateWithSchema } from "../../utils";

export class WorkerQuestionController {
  async createQuestion(req: AuthRequest, res: Response): Promise<void> {
    const data = validateWithSchema(
      createWorkerQuestionSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const viewerId = req.user?.sub ?? null;

    const question = await workerQuestionService.createQuestion(data, viewerId);
    R.created(
      res,
      { id: String(question._id) },
      WORKER_QUESTION_MESSAGES.QUESTION_CREATED,
      req
    );
  }

  async listForWorker(req: AuthRequest, res: Response): Promise<void> {
    const { workerId } = req.params;
    const query = validateWithSchema(
      listWorkerQuestionsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const viewerId = req.user?.sub ?? null;

    const result = await workerQuestionService.listForProfile(
      workerId,
      viewerId,
      query
    );
    R.success(res, result, WORKER_QUESTION_MESSAGES.QUESTIONS_FETCHED, req);
  }

  async answerQuestion(req: AuthRequest, res: Response): Promise<void> {
    const workerId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const data = validateWithSchema(
      answerWorkerQuestionSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const question = await workerQuestionService.answerQuestion(
      id,
      data.answer,
      workerId
    );
    R.success(res, question, WORKER_QUESTION_MESSAGES.QUESTION_ANSWERED, req);
  }
}

export const workerQuestionController = new WorkerQuestionController();
