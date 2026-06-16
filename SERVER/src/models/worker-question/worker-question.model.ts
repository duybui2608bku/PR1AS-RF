import mongoose, { Schema } from "mongoose";
import {
  WorkerQuestionVisibility,
  WORKER_QUESTION_LIMITS,
} from "../../constants/worker-question";
import { IWorkerQuestionDocument } from "../../types/worker-question";
import { modelsName } from "../models.name";

const workerQuestionSchema = new Schema<IWorkerQuestionDocument>(
  {
    worker_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    asker_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
      index: true,
    },
    asker_nickname: {
      type: String,
      trim: true,
      maxlength: WORKER_QUESTION_LIMITS.MAX_NICKNAME_LENGTH,
      default: null,
    },
    asker_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      minlength: WORKER_QUESTION_LIMITS.MIN_QUESTION_LENGTH,
      maxlength: WORKER_QUESTION_LIMITS.MAX_QUESTION_LENGTH,
    },
    visibility: {
      type: String,
      enum: Object.values(WorkerQuestionVisibility),
      default: WorkerQuestionVisibility.PUBLIC,
      index: true,
    },
    answer: {
      type: String,
      trim: true,
      maxlength: WORKER_QUESTION_LIMITS.MAX_ANSWER_LENGTH,
      default: null,
    },
    answered_at: {
      type: Date,
      default: null,
    },
    is_hidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: modelsName.WORKER_QUESTION,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

workerQuestionSchema.index({ worker_id: 1, is_hidden: 1, created_at: -1 });

export const WorkerQuestion = mongoose.model<IWorkerQuestionDocument>(
  modelsName.WORKER_QUESTION,
  workerQuestionSchema
);
