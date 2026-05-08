import { Document, Types } from "mongoose";
import { ReactionTargetType, ReactionType } from "../../constants/reaction";

export interface IReaction {
  user_id: Types.ObjectId;
  target_type: ReactionTargetType;
  target_id: Types.ObjectId;
  type: ReactionType;
  created_at: Date;
  updated_at: Date;
}

export interface IReactionDocument extends IReaction, Document {}

export interface UpsertReactionInput {
  target_type: ReactionTargetType;
  target_id: string;
  type: ReactionType;
}

export interface RemoveReactionInput {
  target_type: ReactionTargetType;
  target_id: string;
}

export interface ReactionSummary {
  total: number;
  counts: Record<ReactionType, number>;
  my_reaction: ReactionType | null;
}

export interface ReactionPublic {
  id: string;
  user_id: string;
  target_type: ReactionTargetType;
  target_id: string;
  type: ReactionType;
  created_at: Date;
  updated_at: Date;
}
