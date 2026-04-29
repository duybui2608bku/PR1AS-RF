import { z } from "zod";

const locationRegex = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
const emptyToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const scheduleSchema = z
  .string()
  .trim()
  .datetime({
    offset: true,
    message: "schedule must be a valid ISO-8601 datetime with timezone",
  })
  .transform((value) => new Date(value))
  .refine((value) => !Number.isNaN(value.getTime()), {
    message: "schedule must be a valid datetime",
  });

export const workerGroupedByServiceQuerySchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  location: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .regex(locationRegex, {
        message: "location must be in 'lat,lng' format",
      })
      .refine((value) => {
        const [latText, lngText] = value.split(",");
        const lat = Number(latText);
        const lng = Number(lngText);
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      }, "location latitude must be [-90, 90] and longitude must be [-180, 180]")
      .optional()
  ),
  schedule: z.preprocess(emptyToUndefined, scheduleSchema.optional()),
  category: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
});

export type WorkerGroupedByServiceQuery = z.infer<
  typeof workerGroupedByServiceQuerySchema
>;
