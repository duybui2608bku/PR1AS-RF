import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { SITE_SETTINGS_DEFAULTS } from "../../constants/site-settings";
import { ISiteSettingsDocument } from "../../types/site-settings";

const siteSettingsSchema = new Schema<ISiteSettingsDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      default: SITE_SETTINGS_DEFAULTS.name,
    },
    shortName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
      default: SITE_SETTINGS_DEFAULTS.shortName,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: SITE_SETTINGS_DEFAULTS.description,
    },
    logoUrl: { type: String, trim: true, maxlength: 500, default: "" },
    faviconUrl: { type: String, trim: true, maxlength: 500, default: "" },
    siteUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: SITE_SETTINGS_DEFAULTS.siteUrl,
    },
    contactEmail: {
      type: String,
      trim: true,
      maxlength: 254,
      default: SITE_SETTINGS_DEFAULTS.contactEmail,
    },
    ogImageUrl: { type: String, trim: true, maxlength: 500, default: "" },
    keywords: {
      type: String,
      trim: true,
      maxlength: 500,
      default: SITE_SETTINGS_DEFAULTS.keywords,
    },
    twitterHandle: { type: String, trim: true, maxlength: 50, default: "" },
    facebook: {
      type: String,
      trim: true,
      maxlength: 500,
      default: SITE_SETTINGS_DEFAULTS.facebook,
    },
    twitter: {
      type: String,
      trim: true,
      maxlength: 500,
      default: SITE_SETTINGS_DEFAULTS.twitter,
    },
    zalo: {
      type: String,
      trim: true,
      maxlength: 500,
      default: SITE_SETTINGS_DEFAULTS.zalo,
    },
    github: {
      type: String,
      trim: true,
      maxlength: 500,
      default: SITE_SETTINGS_DEFAULTS.github,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
    },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: modelsName.SITE_SETTINGS,
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

export const SiteSettings = mongoose.model<ISiteSettingsDocument>(
  modelsName.SITE_SETTINGS,
  siteSettingsSchema
);
