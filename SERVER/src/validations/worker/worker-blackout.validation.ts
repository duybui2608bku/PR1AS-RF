import { z } from "zod";

const isoDateTime = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), {
    message: "Must be a valid ISO date string",
  })
  .transform((v) => new Date(v));

export const createWorkerBlackoutSchema = z
  .object({
    start_time: isoDateTime,
    end_time: isoDateTime,
    reason: z.string().trim().max(500).optional(),
  })
  .refine((data) => data.end_time.getTime() > data.start_time.getTime(), {
    message: "end_time must be after start_time",
    path: ["end_time"],
  });

export const listWorkerBlackoutQuerySchema = z.object({
  start_date: isoDateTime.optional(),
  end_date: isoDateTime.optional(),
});

export type CreateWorkerBlackoutSchemaType = z.infer<
  typeof createWorkerBlackoutSchema
>;
export type ListWorkerBlackoutQueryType = z.infer<
  typeof listWorkerBlackoutQuerySchema
>;
