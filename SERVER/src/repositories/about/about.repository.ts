import { Types } from "mongoose";
import { AboutContent } from "../../models/about";
import { ABOUT_DEFAULTS } from "../../constants/about";
import type {
  IAboutContentDocument,
  AboutContentPatch,
} from "../../types/about";

const SECTIONS = ["hero", "what", "why", "features", "cta"] as const;

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

export class AboutRepository {
  private async getDoc(): Promise<IAboutContentDocument> {
    const existing = await AboutContent.findOne();
    if (existing) return existing;
    // Seed the singleton with factory defaults on first access.
    return AboutContent.create({ ...ABOUT_DEFAULTS });
  }

  async get(): Promise<IAboutContentDocument> {
    return this.getDoc();
  }

  async update(
    patch: AboutContentPatch,
    adminId: string
  ): Promise<IAboutContentDocument> {
    const doc = await this.getDoc();
    const current = doc.toObject() as Record<string, unknown>;

    for (const section of SECTIONS) {
      const sectionPatch = patch[section];
      if (!sectionPatch) continue;
      doc.set(section, deepMerge(current[section], sectionPatch));
    }

    doc.set("updatedBy", new Types.ObjectId(adminId));
    doc.set("updatedAt", new Date());
    await doc.save();
    return doc;
  }

  async reset(adminId: string): Promise<IAboutContentDocument> {
    const doc = await this.getDoc();
    doc.set({
      ...ABOUT_DEFAULTS,
      updatedBy: new Types.ObjectId(adminId),
      updatedAt: new Date(),
    });
    await doc.save();
    return doc;
  }
}

export const aboutRepository = new AboutRepository();
