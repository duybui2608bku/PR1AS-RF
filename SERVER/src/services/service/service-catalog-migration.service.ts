import mongoose from "mongoose";
import { Service } from "../../models/service/service";
import { WorkerService } from "../../models/worker/worker-service";
import { Booking } from "../../models/booking/booking.model";
import { Migration } from "../../models/migration";
import {
  OLD_TO_NEW_SERVICE_CODE,
  SERVICE_CATALOG_MIGRATION_NAME,
  SERVICE_CATALOG_V2,
} from "../../constants/service-catalog";
import { withJobLock } from "../../utils/job-lock";
import { logger } from "../../utils/logger";

const LOCK_NAME = `migration:${SERVICE_CATALOG_MIGRATION_NAME}`;
const LOCK_TTL_MS = 5 * 60 * 1000;

interface MigrationOptions {
  // When false, only logs what would change without writing. Defaults to true
  // (the boot-time path applies the migration).
  apply?: boolean;
}

export class ServiceCatalogMigrationService {
  // Upserts the v2 catalog by `code`. Idempotent: re-running only refreshes
  // mutable fields and never creates duplicates.
  private async seedCatalog(now: Date): Promise<void> {
    const operations: Parameters<typeof Service.bulkWrite>[0] =
      SERVICE_CATALOG_V2.map((seed) => ({
        updateOne: {
          filter: { code: seed.code },
          update: {
            $set: {
              category: seed.category,
              icon: seed.icon,
              name: seed.name,
              description: seed.description,
              is_active: true,
              companionship_level: null,
              rules: null,
              updated_at: now,
            },
            $setOnInsert: { code: seed.code, created_at: now },
          },
          upsert: true,
        },
      }));

    await Service.bulkWrite(operations);
  }

  // Maps the new v2 codes to their freshly-upserted ObjectIds.
  private async loadNewCodeIds(): Promise<Map<string, mongoose.Types.ObjectId>> {
    const codes = SERVICE_CATALOG_V2.map((s) => s.code);
    const docs = await Service.find({ code: { $in: codes } })
      .select("_id code")
      .lean();

    const map = new Map<string, mongoose.Types.ObjectId>();
    for (const doc of docs) {
      map.set(doc.code, doc._id as mongoose.Types.ObjectId);
    }
    return map;
  }

  // Collapses worker_service rows that, after remapping, now share the same
  // (worker_id, service_id). Keeps the earliest row, repoints bookings that
  // referenced the duplicates, then deletes them. worker_service has no DB-level
  // unique index on (worker_id, service_id), so this is done explicitly.
  private async dedupeWorkerServices(
    apply: boolean
  ): Promise<{ removed: number; bookingsRepointed: number }> {
    const groups = await WorkerService.aggregate<{
      _id: { worker_id: mongoose.Types.ObjectId; service_id: mongoose.Types.ObjectId };
      ids: mongoose.Types.ObjectId[];
    }>([
      { $sort: { created_at: 1, _id: 1 } },
      {
        $group: {
          _id: { worker_id: "$worker_id", service_id: "$service_id" },
          ids: { $push: "$_id" },
        },
      },
      { $match: { "ids.1": { $exists: true } } },
    ]);

    let removed = 0;
    let bookingsRepointed = 0;

    for (const group of groups) {
      const [winner, ...losers] = group.ids;
      if (!losers.length) continue;
      removed += losers.length;

      if (apply) {
        const repoint = await Booking.updateMany(
          { worker_service_id: { $in: losers } },
          { $set: { worker_service_id: winner } }
        );
        bookingsRepointed += repoint.modifiedCount ?? 0;
        await WorkerService.deleteMany({ _id: { $in: losers } });
      } else {
        const repoint = await Booking.countDocuments({
          worker_service_id: { $in: losers },
        });
        bookingsRepointed += repoint;
      }
    }

    return { removed, bookingsRepointed };
  }

  private async runInternal(apply: boolean): Promise<void> {
    const now = new Date();

    if (apply) {
      await this.seedCatalog(now);
    }

    const newCodeIds = await this.loadNewCodeIds();
    const oldCodes = Object.keys(OLD_TO_NEW_SERVICE_CODE);

    let workerServicesRemapped = 0;
    let bookingsRemapped = 0;

    for (const [oldCode, newCode] of Object.entries(OLD_TO_NEW_SERVICE_CODE)) {
      const newId = newCodeIds.get(newCode);

      if (apply && newId) {
        const ws = await WorkerService.updateMany(
          { service_code: oldCode },
          { $set: { service_id: newId, service_code: newCode, updated_at: now } }
        );
        workerServicesRemapped += ws.modifiedCount ?? 0;

        const bk = await Booking.updateMany(
          { service_code: oldCode },
          { $set: { service_id: newId, service_code: newCode, updated_at: now } }
        );
        bookingsRemapped += bk.modifiedCount ?? 0;
      } else {
        if (apply && !newId) {
          logger.warn(
            `[service-catalog-v2] missing new service for code ${newCode} (mapped from ${oldCode}); skipping`
          );
        }
        workerServicesRemapped += await WorkerService.countDocuments({
          service_code: oldCode,
        });
        bookingsRemapped += await Booking.countDocuments({
          service_code: oldCode,
        });
      }
    }

    const dedupe = await this.dedupeWorkerServices(apply);

    if (apply) {
      await Service.updateMany(
        { code: { $in: oldCodes } },
        { $set: { is_active: false, updated_at: now } }
      );
    }

    logger.info(
      `[service-catalog-v2] ${apply ? "applied" : "dry-run"}: ` +
        `${SERVICE_CATALOG_V2.length} services upserted, ` +
        `${workerServicesRemapped} worker_service remapped, ` +
        `${bookingsRemapped} bookings remapped, ` +
        `${dedupe.removed} duplicate worker_service removed ` +
        `(${dedupe.bookingsRepointed} bookings repointed), ` +
        `${oldCodes.length} old services deactivated`
    );
  }

  // Boot-time entry point. Skips immediately if already applied, otherwise runs
  // under a cross-instance lock and records a marker so it runs exactly once.
  async runOnBoot(): Promise<void> {
    const already = await Migration.exists({
      name: SERVICE_CATALOG_MIGRATION_NAME,
    });
    if (already) {
      return;
    }

    await withJobLock(LOCK_NAME, { ttlMs: LOCK_TTL_MS }, async () => {
      const stillPending = !(await Migration.exists({
        name: SERVICE_CATALOG_MIGRATION_NAME,
      }));
      if (!stillPending) {
        return;
      }

      logger.info("[service-catalog-v2] starting migration");
      await this.runInternal(true);
      await Migration.create({
        name: SERVICE_CATALOG_MIGRATION_NAME,
        applied_at: new Date(),
      });
      logger.info("[service-catalog-v2] migration complete");
    });
  }

  // Manual entry point for the CLI script (supports dry-run).
  async runManual(options: MigrationOptions = {}): Promise<void> {
    const apply = options.apply ?? false;
    await this.runInternal(apply);
  }
}

export const serviceCatalogMigrationService =
  new ServiceCatalogMigrationService();
