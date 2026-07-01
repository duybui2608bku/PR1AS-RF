import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { ILegalContentDocument, LEGAL_PAGE_KEYS } from "../../types/legal";

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

const sectionSchema = new Schema(
  {
    title: { type: localizedText(2000), default: () => ({}) },
    body: { type: localizedText(60000), default: () => ({}) },
  },
  { _id: false }
);

const legalContentSchema = new Schema<ILegalContentDocument>(
  {
    page: {
      type: String,
      enum: LEGAL_PAGE_KEYS,
      required: true,
      unique: true,
      index: true,
    },
    title: { type: localizedText(2000), default: () => ({}) },
    lastUpdated: { type: localizedText(2000), default: () => ({}) },
    intro: { type: localizedText(30000), default: () => ({}) },
    sections: { type: [sectionSchema], default: [] },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
    },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: modelsName.LEGAL_CONTENT,
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

export const LegalContent = mongoose.model<ILegalContentDocument>(
  modelsName.LEGAL_CONTENT,
  legalContentSchema
);
