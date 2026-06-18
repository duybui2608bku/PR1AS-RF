import "dotenv/config";
import { connectDatabase, closeDatabase } from "../config/database";
import { serviceCatalogMigrationService } from "../services/service/service-catalog-migration.service";
import { logger } from "../utils/logger";

// Manual runner for the v2 service catalog migration.
//   npm run migrate:service-catalog            -> dry-run (no writes)
//   npm run migrate:service-catalog -- --apply -> apply changes
// Note: the migration also runs automatically on server boot; this script is
// for inspecting the impact (dry-run) or applying out-of-band.
const main = async (): Promise<void> => {
  const apply = process.argv.includes("--apply");
  await connectDatabase();
  try {
    await serviceCatalogMigrationService.runManual({ apply });
  } finally {
    await closeDatabase();
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("migrate-service-catalog failed:", error);
    process.exit(1);
  });
