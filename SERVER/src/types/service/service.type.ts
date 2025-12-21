import { Document } from "mongoose";

export enum ServiceCategory {
  ASSISTANCE = "ASSISTANCE",
  COMPANIONSHIP = "COMPANIONSHIP",
}

export enum DressCode {
  CASUAL = "CASUAL",
  SEMI_FORMAL = "SEMI_FORMAL",
  FORMAL = "FORMAL",
}

export interface IServiceDocument extends Document {
  category: ServiceCategory;
  code: string;
  name: {
    en: string;
    vi: string;
    zh?: string;
    ko?: string;
  };
  description: {
    en: string;
    vi: string;
    zh?: string;
    ko?: string;
  };
  companionship_level: number | null;
  rules: {
    physical_touch: boolean;
    intellectual_conversation_required: boolean;
    dress_code: DressCode;
  } | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
