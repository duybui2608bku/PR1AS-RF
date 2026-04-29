import { z } from "zod";

const numberFromQuery = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  },
  z
    .number({
      invalid_type_error: "limit must be a number",
    })
    .int({ message: "limit must be an integer" })
    .min(1, { message: "limit must be at least 1" })
    .max(20, { message: "limit must be at most 20" })
    .optional()
);

export const locationSuggestionsQuerySchema = z.object({
  q: z
    .string({ required_error: "q is required" })
    .trim()
    .min(2, { message: "q must be at least 2 characters" }),
  limit: numberFromQuery.transform((value) => value ?? 10),
});

export type LocationSuggestionsQuery = z.infer<
  typeof locationSuggestionsQuerySchema
>;
