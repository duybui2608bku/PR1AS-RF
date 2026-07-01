import { Types } from "mongoose";
import { LegalContent } from "../../models/legal";
import { LEGAL_DEFAULTS } from "../../constants/legal";
import type {
  ILegalContentDocument,
  LegalContentPatch,
  LegalPageKey,
} from "../../types/legal";

/** Localized scalar fields deep-merged so a single-locale save keeps the rest. */
const LOCALIZED_FIELDS = ["title", "lastUpdated", "intro"] as const;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Deep-merge `patch` into `base`: plain objects merge key-by-key (so saving one
 * locale keeps the others intact), while arrays and scalars replace wholesale.
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

export class LegalRepository {
  private async getDoc(page: LegalPageKey): Promise<ILegalContentDocument> {
    const existing = await LegalContent.findOne({ page });
    if (existing) return existing;
    // Seed the per-page singleton with factory defaults on first access.
    return LegalContent.create({ page, ...LEGAL_DEFAULTS[page] });
  }

  async get(page: LegalPageKey): Promise<ILegalContentDocument> {
    return this.getDoc(page);
  }

  async update(
    page: LegalPageKey,
    patch: LegalContentPatch,
    adminId: string
  ): Promise<ILegalContentDocument> {
    const doc = await this.getDoc(page);
    const current = doc.toObject() as Record<string, unknown>;

    for (const field of LOCALIZED_FIELDS) {
      const fieldPatch = patch[field];
      if (!fieldPatch) continue;
      doc.set(field, deepMerge(current[field], fieldPatch));
    }

    // Sections are replaced wholesale (order + count are admin-controlled).
    if (patch.sections !== undefined) {
      doc.set("sections", patch.sections);
    }

    doc.set("updatedBy", new Types.ObjectId(adminId));
    doc.set("updatedAt", new Date());
    await doc.save();
    return doc;
  }

  async reset(
    page: LegalPageKey,
    adminId: string
  ): Promise<ILegalContentDocument> {
    const doc = await this.getDoc(page);
    doc.set({
      ...LEGAL_DEFAULTS[page],
      updatedBy: new Types.ObjectId(adminId),
      updatedAt: new Date(),
    });
    await doc.save();
    return doc;
  }
}

export const legalRepository = new LegalRepository();
