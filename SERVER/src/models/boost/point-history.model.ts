import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { PointReason } from "../../constants/boost";
import { IPointHistoryDocument } from "../../types/boost/boost.types";

const pointHistorySchema = new Schema<IPointHistoryDocument>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: modelsName.USER, required: true, index: true },
    delta: { type: Number, required: true },
    reason: { type: String, enum: Object.values(PointReason), required: true },
    balance_after: { type: Number, required: true },
    meta: {
      admin_note: { type: String, default: undefined },
      boost_id: { type: String, default: undefined },
      admin_id: { type: String, default: undefined },
    },
    created_at: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    collection: modelsName.POINT_HISTORY,
  }
);

export const PointHistory = mongoose.model<IPointHistoryDocument>(
  modelsName.POINT_HISTORY,
  pointHistorySchema
);
