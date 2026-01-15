import { z } from "zod";
import { EscrowStatus } from "../../constants/escrow";

const dateSchema = z
  .union([z.string().datetime(), z.date(), z.string()])
  .transform((val) => {
    if (typeof val === "string") {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date format");
      }
      return date;
    }
    return val;
  })
  .optional();

export const getEscrowsQuerySchema = z.object({
  client_id: z.string().optional(),
  worker_id: z.string().optional(),
  status: z.nativeEnum(EscrowStatus).optional(),
  start_date: dateSchema,
  end_date: dateSchema,
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().positive().min(1).max(100)),
});

export type GetEscrowsQuerySchemaType = z.infer<typeof getEscrowsQuerySchema>;
