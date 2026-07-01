import { Document, Types } from "mongoose";

/** A piece of text configured per supported UI locale. Stored as sanitized HTML. */
export interface LocalizedText {
  vi: string;
  en: string;
  zh: string;
  ko: string;
}

export type LocalizedPatch = Partial<LocalizedText>;

/** Legal pages that share the flexible "title + sections" structure. */
export const LEGAL_PAGE_KEYS = ["privacy", "terms"] as const;
export type LegalPageKey = (typeof LEGAL_PAGE_KEYS)[number];

export interface LegalSection {
  title: LocalizedText;
  /** Rich-text body (HTML) per locale. */
  body: LocalizedText;
}

/** Section as received in a partial update (locales may be omitted). */
export interface LegalSectionPatch {
  title: LocalizedPatch;
  body: LocalizedPatch;
}

/** The editable content payload (without persistence metadata). */
export interface LegalContentData {
  title: LocalizedText;
  lastUpdated: LocalizedText;
  /** Optional rich-text intro shown above the sections. */
  intro: LocalizedText;
  sections: LegalSection[];
}

export interface ILegalContent extends LegalContentData {
  page: LegalPageKey;
  updatedBy: Types.ObjectId | null;
  updatedAt: Date;
}

export interface ILegalContentDocument extends ILegalContent, Document {}

/**
 * Partial update. Localized scalar fields accept a partial locale map so saving
 * one language never wipes the others; the sections list is replaced wholesale.
 */
export interface LegalContentPatch {
  title?: LocalizedPatch;
  lastUpdated?: LocalizedPatch;
  intro?: LocalizedPatch;
  sections?: LegalSectionPatch[];
}
