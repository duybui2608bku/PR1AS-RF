import { Document, Types } from "mongoose";

/** A piece of text configured per supported UI locale. Stored as sanitized HTML/text. */
export interface LocalizedText {
  vi: string;
  en: string;
  zh: string;
  ko: string;
}

export type LocalizedPatch = Partial<LocalizedText>;

/** The editable content payload (without persistence metadata). */
export interface ContactContentData {
  title: LocalizedText;
  subtitle: LocalizedText;
  /** Plain contact channels — not localized (same value across languages). */
  email: string;
  phone: string;
  /** Localized address and working hours. */
  address: LocalizedText;
  hours: LocalizedText;
  /** Rich-text body (HTML) per locale — free-form description. */
  body: LocalizedText;
}

export interface IContactContent extends ContactContentData {
  updatedBy: Types.ObjectId | null;
  updatedAt: Date;
}

export interface IContactContentDocument extends IContactContent, Document {}

/**
 * Partial update. Localized fields accept a partial locale map so saving one
 * language never wipes the others; plain fields replace wholesale.
 */
export interface ContactContentPatch {
  title?: LocalizedPatch;
  subtitle?: LocalizedPatch;
  email?: string;
  phone?: string;
  address?: LocalizedPatch;
  hours?: LocalizedPatch;
  body?: LocalizedPatch;
}
