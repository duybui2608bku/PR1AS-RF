import { Types } from "mongoose";
import { WorkerQuestion } from "../../models/worker-question/worker-question.model";
import {
  CreateWorkerQuestionInput,
  IWorkerQuestionDocument,
  WorkerQuestionListQuery,
} from "../../types/worker-question";

export class WorkerQuestionRepository {
  async create(
    data: CreateWorkerQuestionInput
  ): Promise<IWorkerQuestionDocument> {
    const question = new WorkerQuestion({
      ...data,
      answer: null,
      answered_at: null,
      is_hidden: false,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return question.save();
  }

  async findById(id: string): Promise<IWorkerQuestionDocument | null> {
    return WorkerQuestion.findById(id);
  }

  async listByWorker(
    workerId: string,
    query: WorkerQuestionListQuery
  ): Promise<{ questions: IWorkerQuestionDocument[]; total: number }> {
    const filter = {
      worker_id: new Types.ObjectId(workerId),
      is_hidden: false,
    };
    const skip = (query.page - 1) * query.limit;

    const [questions, total] = await Promise.all([
      WorkerQuestion.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean<IWorkerQuestionDocument[]>(),
      WorkerQuestion.countDocuments(filter),
    ]);

    return { questions, total };
  }

  async answer(
    id: string,
    answer: string
  ): Promise<IWorkerQuestionDocument | null> {
    return WorkerQuestion.findByIdAndUpdate(
      id,
      {
        answer,
        answered_at: new Date(),
        updated_at: new Date(),
      },
      { new: true }
    );
  }
}

export const workerQuestionRepository = new WorkerQuestionRepository();
