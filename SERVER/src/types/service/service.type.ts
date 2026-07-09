import { Document, Types } from "mongoose";

export enum ServiceCategory {
  VIRTUAL = "VIRTUAL",
  PHYSICAL = "PHYSICAL",
}

export enum DressCode {
  CASUAL = "CASUAL",
  SEMI_FORMAL = "SEMI_FORMAL",
  FORMAL = "FORMAL",
}

export interface LocalizedName {
  en: string;
  vi: string;
  zh?: string | null;
  ko?: string | null;
}

export interface LocalizedDescription {
  en?: string;
  vi?: string;
  zh?: string | null;
  ko?: string | null;
}

export interface ServiceRules {
  physical_touch: boolean;
  intellectual_conversation_required: boolean;
  dress_code: DressCode;
}

export interface IServiceDocument extends Document {
  category: ServiceCategory;
  code: string;
  icon: string;
  name: LocalizedName;
  description: LocalizedDescription;
  companionship_level: number | null;
  rules: ServiceRules | null;
  is_active: boolean;
  deprecated_at: Date | null;
  created_by: Types.ObjectId | null;
  updated_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateServiceInput {
  category: ServiceCategory;
  icon: string;
  name: LocalizedName;
  description?: LocalizedDescription;
  companionship_level?: number | null;
  rules?: ServiceRules | null;
}

export interface UpdateServiceInput {
  category?: ServiceCategory;
  icon?: string;
  name?: LocalizedName;
  description?: LocalizedDescription;
  companionship_level?: number | null;
  rules?: ServiceRules | null;
}

export interface AdminServiceFilter {
  category?: ServiceCategory;
  is_active?: boolean;
}
