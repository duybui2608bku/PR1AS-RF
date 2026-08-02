import "dotenv/config";
import { connectDatabase, closeDatabase } from "../config/database";
import { workerReputationMigrationService } from "../services/reputation/worker-reputation-migration.service";
import { logger } from "../utils/logger";

// One-time backfill for the worker-reputation rework.
//   npm run migrate:worker-reputation            -> dry-run (logs only)
//   npm run migrate:worker-reputation -- --apply -> writes scores
const main = async (): Promise<void> => {
  const apply = process.argv.includes("--apply");
  await connectDatabase();
  try {
    const result = await workerReputationMigrationService.runManual({ apply });
    logger.info("Worker reputation migration finished", result);
  } finally {
    await closeDatabase();
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("migrate-worker-reputation failed:", error);
    process.exit(1);
  });
