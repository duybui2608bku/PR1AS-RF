import { z } from "zod";

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const workerSuggestionQuerySchema = z.object({
  limit: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(12).default(4)
  ),
});

export type WorkerSuggestionQuery = z.infer<typeof workerSuggestionQuerySchema>;
