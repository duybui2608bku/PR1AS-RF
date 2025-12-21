import { z } from "zod";
import { ServiceCategory } from "../../types/service/service.type";

export const searchServicesQuerySchema = z.object({
  category: z
    .nativeEnum(ServiceCategory, {
      errorMap: () => ({
        message: `Category must be one of: ${Object.values(ServiceCategory).join(", ")}`,
      }),
    })
    .optional(),
  is_active: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return val === "true";
    }),
});

export type SearchServicesQueryType = z.infer<
  typeof searchServicesQuerySchema
>;

