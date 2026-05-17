import { Document, Types } from "mongoose";
import {
  ReportReason,
  ReportStatus,
  ReportTargetType,
  RestrictionFeature,
  RestrictionStatus,
} from "../../constants/moderation";

export interface IUserBlock {
  blocker_id: Types.ObjectId;
  blocked_id: Types.ObjectId;
  block_profile: boolean;
  reason?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface IUserBlockDocument extends IUserBlock, Document {}

export interface IReport {
  reporter_id: Types.ObjectId;
  target_type: ReportTargetType;
  reason: ReportReason;
  description: string;
  post_id?: Types.ObjectId | null;
  worker_id?: Types.ObjectId | null;
  target_user_id?: Types.ObjectId | null;
  booking_id?: Types.ObjectId | null;
  status: ReportStatus;
  admin_note?: string | null;
  resolved_by?: Types.ObjectId | null;
  resolved_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface IReportDocument extends IReport, Document {}

export interface IUserRestriction {
  user_id: Types.ObjectId;
  feature: RestrictionFeature;
  reason: string;
  starts_at: Date;
  ends_at?: Date | null;
  status: RestrictionStatus;
  created_by: Types.ObjectId;
  revoked_by?: Types.ObjectId | null;
  revoked_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface IUserRestrictionDocument extends IUserRestriction, Document {}

export interface ReportQuery {
  target_type?: ReportTargetType;
  status?: ReportStatus;
  start_date?: Date;
  end_date?: Date;
  page: number;
  limit: number;
  skip: number;
}

export interface RestrictionQuery {
  user_id?: string;
  feature?: RestrictionFeature;
  status?: RestrictionStatus;
  page: number;
  limit: number;
  skip: number;
}
