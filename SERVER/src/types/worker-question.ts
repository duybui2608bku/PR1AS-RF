import { Document, Types } from "mongoose";
import { WorkerQuestionVisibility } from "../constants/worker-question";

export interface IWorkerQuestion {
  worker_id: Types.ObjectId;
  asker_id: Types.ObjectId | null;
  asker_nickname: string | null;
  asker_email: string;
  question: string;
  visibility: WorkerQuestionVisibility;
  answer: string | null;
  answered_at: Date | null;
  is_hidden: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IWorkerQuestionDocument extends IWorkerQuestion, Document {}

export interface CreateWorkerQuestionInput {
  worker_id: Types.ObjectId;
  asker_id: Types.ObjectId | null;
  asker_nickname: string | null;
  asker_email: string;
  question: string;
  visibility: WorkerQuestionVisibility;
}

export interface WorkerQuestionListQuery {
  page: number;
  limit: number;
}

/**
 * Shape returned to the profile page. Private questions are masked for viewers
 * who are neither the worker nor the original asker — `question`/`answer` become
 * `***` and the asker identity is stripped, while id/visibility/timestamps stay
 * so the UI can still render the masked thread row.
 */
export interface WorkerQuestionView {
  id: string;
  visibility: WorkerQuestionVisibility;
  asker_nickname: string | null;
  question: string;
  answer: string | null;
  answered_at: string | null;
  is_answered: boolean;
  is_masked: boolean;
  can_answer: boolean;
  created_at: string;
}
