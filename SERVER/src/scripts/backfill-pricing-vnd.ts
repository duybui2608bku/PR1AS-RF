/**
 * Backfill `exchange_rate` and `price_vnd` on existing worker-service pricing.
 *
 * Existing records predate multi-currency, so their prices are all in VND.
 * For each pricing slot we set `exchange_rate` from its currency (default 1)
 * and `price_vnd = price * exchange_rate`. Idempotent: slots that already have
 * a `price_vnd` are skipped.
 *
 * Run:  npx ts-node src/scripts/backfill-pricing-vnd.ts
 */
import "dotenv/config";
import { connectDatabase, closeDatabase } from "../config/database";
import { WorkerService } from "../models/worker/worker-service";
import { getExchangeRate, toVnd } from "../constants/currency";
import { logger } from "../utils/logger";

async function backfillPricingVnd(): Promise<void> {
  const docs = await WorkerService.find({}).exec();
  let updatedDocs = 0;
  let updatedSlots = 0;

  for (const doc of docs) {
    let changed = false;
    for (const slot of doc.pricing) {
      if (typeof slot.price_vnd === "number" && slot.price_vnd > 0) {
        continue;
      }
      const currency = slot.currency || "VND";
      slot.exchange_rate = getExchangeRate(currency);
      slot.price_vnd = toVnd(slot.price, currency);
      changed = true;
      updatedSlots += 1;
    }
    if (changed) {
      await doc.save();
      updatedDocs += 1;
    }
  }

  logger.info(
    `Backfill done: ${updatedSlots} pricing slot(s) across ${updatedDocs} worker-service doc(s) updated.`
  );
}

async function main(): Promise<void> {
  await connectDatabase();
  try {
    await backfillPricingVnd();
  } finally {
    await closeDatabase();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Backfill failed:", error);
    process.exit(1);
  });
