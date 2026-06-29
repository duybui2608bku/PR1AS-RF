import { Document, Types } from "mongoose";

/** A piece of text configured per supported UI locale. Stored as sanitized HTML. */
export interface LocalizedText {
  vi: string;
  en: string;
  zh: string;
  ko: string;
}

export type LocalizedPatch = Partial<LocalizedText>;

export interface AboutItem {
  title: LocalizedText;
  description: LocalizedText;
}

/** Item as received in a partial update (locales may be omitted). */
export interface AboutItemPatch {
  title: LocalizedPatch;
  description: LocalizedPatch;
}

export interface AboutHero {
  badge: LocalizedText;
  title: LocalizedText;
  subtitle: LocalizedText;
}

export interface AboutWhat {
  title: LocalizedText;
  tagline: LocalizedText;
  /** Rich-text body (HTML) per locale — replaces the old paragraph array. */
  body: LocalizedText;
}

export interface AboutSectionWithItems {
  title: LocalizedText;
  subtitle: LocalizedText;
  items: AboutItem[];
}

export interface AboutCta {
  title: LocalizedText;
  subtitle: LocalizedText;
  primary: LocalizedText;
  secondary: LocalizedText;
}

/** The editable content payload (without persistence metadata). */
export interface AboutContentData {
  hero: AboutHero;
  what: AboutWhat;
  why: AboutSectionWithItems;
  features: AboutSectionWithItems;
  cta: AboutCta;
}

export interface IAboutContent extends AboutContentData {
  updatedBy: Types.ObjectId | null;
  updatedAt: Date;
}

export interface IAboutContentDocument extends IAboutContent, Document {}

/**
 * Partial update. Localized fields accept a partial locale map so saving one
 * language never wipes the others; item lists are replaced wholesale.
 */
export interface AboutContentPatch {
  hero?: {
    badge?: LocalizedPatch;
    title?: LocalizedPatch;
    subtitle?: LocalizedPatch;
  };
  what?: {
    title?: LocalizedPatch;
    tagline?: LocalizedPatch;
    body?: LocalizedPatch;
  };
  why?: {
    title?: LocalizedPatch;
    subtitle?: LocalizedPatch;
    items?: AboutItemPatch[];
  };
  features?: {
    title?: LocalizedPatch;
    subtitle?: LocalizedPatch;
    items?: AboutItemPatch[];
  };
  cta?: {
    title?: LocalizedPatch;
    subtitle?: LocalizedPatch;
    primary?: LocalizedPatch;
    secondary?: LocalizedPatch;
  };
}
