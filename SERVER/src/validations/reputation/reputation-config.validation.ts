import { z } from "zod";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";

export const updateReputationConfigSchema = z
  .object({
    value: z
      .number({ invalid_type_error: "value must be a number" })
      .int("value must be an integer")
      .min(0, "value must be >= 0")
      .max(100, "value must be <= 100")
      .optional(),
    active: z
      .boolean({ invalid_type_error: "active must be a boolean" })
      .optional(),
  })
  .refine((data) => data.value !== undefined || data.active !== undefined, {
    message: "Provide at least one of: value, active",
  });

export const reputationConfigKeySchema = z.nativeEnum(ReputationConfigKey, {
  errorMap: () => ({ message: `key must be one of: ${Object.values(ReputationConfigKey).join(", ")}` }),
});

export type UpdateReputationConfigInput = z.infer<typeof updateReputationConfigSchema>;
