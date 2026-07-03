import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { IContactContentDocument } from "../../types/contact";

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

const contactContentSchema = new Schema<IContactContentDocument>(
  {
    title: { type: localizedText(2000), default: () => ({}) },
    subtitle: { type: localizedText(4000), default: () => ({}) },
    email: { type: String, trim: true, maxlength: 320, default: "" },
    phone: { type: String, trim: true, maxlength: 64, default: "" },
    address: { type: localizedText(2000), default: () => ({}) },
    hours: { type: localizedText(2000), default: () => ({}) },
    body: { type: localizedText(30000), default: () => ({}) },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
    },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: modelsName.CONTACT_CONTENT,
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

export const ContactContent = mongoose.model<IContactContentDocument>(
  modelsName.CONTACT_CONTENT,
  contactContentSchema
);
