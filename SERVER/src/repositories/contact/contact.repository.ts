import { Types } from "mongoose";
import { ContactContent } from "../../models/contact";
import { CONTACT_DEFAULTS } from "../../constants/contact";
import type {
  IContactContentDocument,
  ContactContentPatch,
} from "../../types/contact";

/** Localized fields are deep-merged so a single-locale save keeps the rest. */
const LOCALIZED_FIELDS = [
  "title",
  "subtitle",
  "address",
  "hours",
  "body",
] as const;

/** Plain scalar fields replaced wholesale when present in the patch. */
const PLAIN_FIELDS = ["email", "phone"] as const;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Deep-merge `patch` into `base`: plain objects merge key-by-key (so saving one
 * locale keeps the others intact), while scalars replace wholesale.
 */
function deepMerge<T>(base: T, patch: unknown): T {
  if (!isPlainObject(patch)) return patch as T;
  const out: Record<string, unknown> = isPlainObject(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    out[key] = isPlainObject(value) ? deepMerge(out[key], value) : value;
  }
  return out as T;
}

export class ContactRepository {
  private async getDoc(): Promise<IContactContentDocument> {
    const existing = await ContactContent.findOne();
    if (existing) return existing;
    // Seed the singleton with factory defaults on first access.
    return ContactContent.create({ ...CONTACT_DEFAULTS });
  }

  async get(): Promise<IContactContentDocument> {
    return this.getDoc();
  }

  async update(
    patch: ContactContentPatch,
    adminId: string
  ): Promise<IContactContentDocument> {
    const doc = await this.getDoc();
    const current = doc.toObject() as Record<string, unknown>;

    for (const field of LOCALIZED_FIELDS) {
      const fieldPatch = patch[field];
      if (!fieldPatch) continue;
      doc.set(field, deepMerge(current[field], fieldPatch));
    }

    for (const field of PLAIN_FIELDS) {
      const value = patch[field];
      if (value !== undefined) doc.set(field, value);
    }

    doc.set("updatedBy", new Types.ObjectId(adminId));
    doc.set("updatedAt", new Date());
    await doc.save();
    return doc;
  }

  async reset(adminId: string): Promise<IContactContentDocument> {
    const doc = await this.getDoc();
    doc.set({
      ...CONTACT_DEFAULTS,
      updatedBy: new Types.ObjectId(adminId),
      updatedAt: new Date(),
    });
    await doc.save();
    return doc;
  }
}

export const contactRepository = new ContactRepository();
