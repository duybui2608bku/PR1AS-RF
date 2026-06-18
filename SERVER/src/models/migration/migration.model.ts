import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";

export interface IMigration {
  name: string;
  applied_at: Date;
}

export interface IMigrationDocument extends IMigration, mongoose.Document {}

// Records which one-off data migrations have already been applied so they are
// not re-run on subsequent server boots.
const migrationSchema = new Schema<IMigrationDocument>(
  {
    name: { type: String, required: true, unique: true, index: true },
    applied_at: { type: Date, required: true, default: () => new Date() },
  },
  {
    collection: modelsName.MIGRATION,
    timestamps: false,
  }
);

export const Migration = mongoose.model<IMigrationDocument>(
  modelsName.MIGRATION,
  migrationSchema
);
