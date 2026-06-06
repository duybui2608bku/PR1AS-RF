import { Document, Types } from "mongoose";
import {
  AnnouncementDisplayType,
  AnnouncementDisplayBehavior,
  AnnouncementTargetRole,
  AnnouncementRedirectTarget,
} from "../constants/announcement";

export interface IAnnouncement {
  title: string;
  content: string;
  images: string[];
  display_types: AnnouncementDisplayType[];
  display_behavior: AnnouncementDisplayBehavior;
  target_roles: AnnouncementTargetRole[];
  placements: string[];
  redirect_url: string | null;
  redirect_target: AnnouncementRedirectTarget;
  allow_close: boolean;
  is_active: boolean;
  start_date: Date | null;
  end_date: Date | null;
  priority: number;
  created_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
  deleted_at: Date | null;
}

export interface IAnnouncementDocument extends IAnnouncement, Document {}

export interface AnnouncementListQuery {
  page: number;
  limit: number;
  skip: number;
  placement?: string;
  is_active?: boolean;
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  images?: string[];
  display_types: AnnouncementDisplayType[];
  display_behavior?: AnnouncementDisplayBehavior;
  target_roles?: AnnouncementTargetRole[];
  placements: string[];
  redirect_url?: string | null;
  redirect_target?: AnnouncementRedirectTarget;
  allow_close?: boolean;
  is_active?: boolean;
  start_date?: Date | null;
  end_date?: Date | null;
  priority?: number;
}

export interface UpdateAnnouncementInput extends Partial<CreateAnnouncementInput> {}
