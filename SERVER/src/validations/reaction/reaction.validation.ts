import { z } from "zod";
import { Types } from "mongoose";
import { ReactionTargetType, ReactionType } from "../../constants/reaction";

const objectIdString = z.string().refine((val) => Types.ObjectId.isValid(val), {
  message: "Invalid ObjectId",
});

export const upsertReactionSchema = z.object({
  target_type: z.nativeEnum(ReactionTargetType),
  target_id: objectIdString,
  type: z.nativeEnum(ReactionType),
});

export const removeReactionSchema = z.object({
  target_type: z.nativeEnum(ReactionTargetType),
  target_id: objectIdString,
});

export const getReactionSummaryQuerySchema = z.object({
  target_type: z.nativeEnum(ReactionTargetType),
  target_id: objectIdString,
});

export type UpsertReactionSchemaType = z.infer<typeof upsertReactionSchema>;
export type RemoveReactionSchemaType = z.infer<typeof removeReactionSchema>;
export type GetReactionSummaryQuerySchemaType = z.infer<
  typeof getReactionSummaryQuerySchema
>;
