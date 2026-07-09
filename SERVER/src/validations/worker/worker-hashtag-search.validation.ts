import { z } from "zod";

const positiveIntFromString = z.preprocess((val) => {
  if (typeof val === "string" && val.trim() !== "") {
    const parsed = Number(val);
    return Number.isNaN(parsed) ? val : parsed;
  }
  return val;
}, z.number().int().positive().optional());

export const workerHashtagSearchQuerySchema = z.object({
  q: z
    .string({ required_error: "q is required" })
    .trim()
    .min(1, { message: "q must not be empty" }),
  page: positiveIntFromString,
  limit: positiveIntFromString,
});

export type WorkerHashtagSearchQuery = z.infer<
  typeof workerHashtagSearchQuerySchema
>;
