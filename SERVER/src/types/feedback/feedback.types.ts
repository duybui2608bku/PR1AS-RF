import { Document, Types } from "mongoose";
import { FeedbackStatus, FeedbackType } from "../../constants/feedback";

export interface IFeedback {
  user_id: Types.ObjectId;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  admin_note?: string | null;
  resolved_by?: Types.ObjectId | null;
  resolved_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface IFeedbackDocument extends IFeedback, Document {}

export interface FeedbackQuery {
  user_id?: string;
  type?: FeedbackType;
  status?: FeedbackStatus;
  page: number;
  limit: number;
  skip: number;
}
