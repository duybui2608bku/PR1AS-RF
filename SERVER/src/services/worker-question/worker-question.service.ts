import { Types } from "mongoose";
import sanitizeHtml from "sanitize-html";
import { workerQuestionRepository } from "../../repositories/worker-question/worker-question.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { AppError } from "../../utils/AppError";
import { PaginationHelper, PaginationMeta } from "../../utils/pagination";
import { logger } from "../../utils/logger";
import { notificationEventService } from "../notification";
import {
  WorkerQuestionVisibility,
  WORKER_QUESTION_MESSAGES,
  WORKER_QUESTION_MASK,
} from "../../constants/worker-question";
import {
  CreateWorkerQuestionSchemaType,
  ListWorkerQuestionsQuerySchemaType,
} from "../../validations/worker-question/worker-question.validation";
import {
  IWorkerQuestionDocument,
  WorkerQuestionView,
} from "../../types/worker-question";
import { UserRole } from "../../types/auth/user.types";

// Q&A fields are plain text — strip every tag/attribute rather than allow-listing
// safe HTML, so nothing renderable is ever persisted.
const toPlainText = (value: string): string =>
  sanitizeHtml(value.replace(/\0/g, ""), {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

const toId = (value: Types.ObjectId | null): string | null =>
  value ? value.toString() : null;

export class WorkerQuestionService {
  async createQuestion(
    input: CreateWorkerQuestionSchemaType,
    viewerId: string | null
  ): Promise<IWorkerQuestionDocument> {
    const workerId = input.worker_id.toString();

    const worker = await userRepository.findById(workerId);
    if (!worker || !worker.roles?.includes(UserRole.WORKER)) {
      throw AppError.notFound(WORKER_QUESTION_MESSAGES.WORKER_NOT_FOUND);
    }

    if (viewerId && viewerId === workerId) {
      throw AppError.badRequest(WORKER_QUESTION_MESSAGES.CANNOT_ASK_SELF);
    }

    let askerId: Types.ObjectId | null = null;
    let askerEmail: string | undefined;
    let askerNickname: string | null = input.nickname?.trim() || null;

    if (viewerId) {
      const asker = await userRepository.findById(viewerId);
      if (!asker) {
        throw AppError.unauthorized();
      }
      askerId = new Types.ObjectId(viewerId);
      askerEmail = asker.email;
      askerNickname = asker.full_name ?? askerNickname;
    } else {
      askerEmail = input.email?.trim();
      if (!askerEmail) {
        throw AppError.badRequest(WORKER_QUESTION_MESSAGES.EMAIL_REQUIRED);
      }
    }

    const question = await workerQuestionRepository.create({
      worker_id: new Types.ObjectId(workerId),
      asker_id: askerId,
      asker_nickname: askerNickname,
      asker_email: askerEmail.toLowerCase(),
      question: toPlainText(input.question),
      visibility: input.visibility,
    });

    void notificationEventService
      .workerQuestionCreated(question)
      .catch((error) =>
        logger.error("Worker question notification failed:", error)
      );

    return question;
  }

  async listForProfile(
    workerId: string,
    viewerId: string | null,
    query: ListWorkerQuestionsQuerySchemaType
  ): Promise<{ data: WorkerQuestionView[]; pagination: PaginationMeta }> {
    const { questions, total } = await workerQuestionRepository.listByWorker(
      workerId,
      query
    );

    const isWorkerOwner = Boolean(viewerId && viewerId === workerId);
    const data = questions.map((question) =>
      this.toView(question, viewerId, isWorkerOwner)
    );

    const pagination = PaginationHelper.calculateMeta(
      query.page,
      query.limit,
      total
    );

    return { data, pagination };
  }

  async answerQuestion(
    questionId: string,
    answer: string,
    workerId: string
  ): Promise<IWorkerQuestionDocument> {
    const question = await workerQuestionRepository.findById(questionId);
    if (!question || question.is_hidden) {
      throw AppError.notFound(WORKER_QUESTION_MESSAGES.QUESTION_NOT_FOUND);
    }

    if (question.worker_id.toString() !== workerId) {
      throw AppError.forbidden(WORKER_QUESTION_MESSAGES.UNAUTHORIZED_ANSWER);
    }

    // Editing an existing answer is allowed, but the asker must only be
    // notified once — on the first reply — so edits never spam them.
    const isFirstAnswer = !question.answer;

    const updated = await workerQuestionRepository.answer(
      questionId,
      toPlainText(answer)
    );
    if (!updated) {
      throw AppError.notFound(WORKER_QUESTION_MESSAGES.QUESTION_NOT_FOUND);
    }

    if (isFirstAnswer) {
      void notificationEventService
        .workerQuestionAnswered(updated)
        .catch((error) =>
          logger.error("Worker question answer notification failed:", error)
        );
    }

    return updated;
  }

  private toView(
    question: IWorkerQuestionDocument,
    viewerId: string | null,
    isWorkerOwner: boolean
  ): WorkerQuestionView {
    const askerId = toId(question.asker_id);
    const isAsker = Boolean(viewerId && askerId && viewerId === askerId);
    const isPrivate = question.visibility === WorkerQuestionVisibility.PRIVATE;
    const masked = isPrivate && !isWorkerOwner && !isAsker;

    return {
      id: String(question._id),
      visibility: question.visibility,
      asker_nickname: masked ? null : question.asker_nickname,
      question: masked ? WORKER_QUESTION_MASK : question.question,
      answer: masked ? null : question.answer,
      answered_at: question.answered_at
        ? question.answered_at.toISOString()
        : null,
      is_answered: Boolean(question.answer),
      is_masked: masked,
      // Owner may answer and re-edit; UI distinguishes via is_answered.
      can_answer: isWorkerOwner,
      created_at: question.created_at.toISOString(),
    };
  }
}

export const workerQuestionService = new WorkerQuestionService();
