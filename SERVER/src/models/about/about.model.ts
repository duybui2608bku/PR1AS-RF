import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { IAboutContentDocument } from "../../types/about";

const localizedText = (maxlength: number) =>
  new Schema(
    {
      vi: { type: String, trim: true, maxlength, default: "" },
      en: { type: String, trim: true, maxlength, default: "" },
      zh: { type: String, trim: true, maxlength, default: "" },
      ko: { type: String, trim: true, maxlength, default: "" },
    },
    { _id: false }
  );

const itemSchema = new Schema(
  {
    title: { type: localizedText(2000), default: () => ({}) },
    description: { type: localizedText(4000), default: () => ({}) },
  },
  { _id: false }
);

const heroSchema = new Schema(
  {
    badge: { type: localizedText(1000), default: () => ({}) },
    title: { type: localizedText(2000), default: () => ({}) },
    subtitle: { type: localizedText(4000), default: () => ({}) },
  },
  { _id: false }
);

const whatSchema = new Schema(
  {
    title: { type: localizedText(2000), default: () => ({}) },
    tagline: { type: localizedText(2000), default: () => ({}) },
    body: { type: localizedText(30000), default: () => ({}) },
  },
  { _id: false }
);

const sectionWithItemsSchema = new Schema(
  {
    title: { type: localizedText(2000), default: () => ({}) },
    subtitle: { type: localizedText(4000), default: () => ({}) },
    items: { type: [itemSchema], default: [] },
  },
  { _id: false }
);

const ctaSchema = new Schema(
  {
    title: { type: localizedText(2000), default: () => ({}) },
    subtitle: { type: localizedText(4000), default: () => ({}) },
    primary: { type: localizedText(1000), default: () => ({}) },
    secondary: { type: localizedText(1000), default: () => ({}) },
  },
  { _id: false }
);

const aboutContentSchema = new Schema<IAboutContentDocument>(
  {
    hero: { type: heroSchema, default: () => ({}) },
    what: { type: whatSchema, default: () => ({}) },
    why: { type: sectionWithItemsSchema, default: () => ({}) },
    features: { type: sectionWithItemsSchema, default: () => ({}) },
    cta: { type: ctaSchema, default: () => ({}) },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
    },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: modelsName.ABOUT_CONTENT,
    minimize: false,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const AboutContent = mongoose.model<IAboutContentDocument>(
  modelsName.ABOUT_CONTENT,
  aboutContentSchema
);
