import { Document, Types } from "mongoose";

export interface IComment {
  post_id: Types.ObjectId;
  author_id: Types.ObjectId;
  parent_comment_id: Types.ObjectId | null;
  body: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface ICommentDocument extends IComment, Document {}

export interface CreateCommentInput {
  body: string;
  parent_comment_id?: string | null;
}

export interface UpdateCommentInput {
  body: string;
}

export interface CommentFeedQuery {
  cursor?: string;
  limit: number;
}

export interface CommentAuthorPublic {
  id: string;
  full_name: string | null;
  avatar: string | null;
  has_worker_profile: boolean;
}

export interface CommentPublic {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author: CommentAuthorPublic;
  body: string;
  created_at: Date;
  updated_at: Date;
}
