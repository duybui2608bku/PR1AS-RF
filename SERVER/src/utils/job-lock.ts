import os from "os";
import { JobLock } from "../models/job-lock";
import { logger } from "./logger";

const INSTANCE_ID = `${os.hostname()}#${process.pid}`;

export interface JobLockOptions {
  ttlMs: number;
}

// Atomic, cross-instance job lock backed by MongoDB. Uses findOneAndUpdate
// with an upsert and a stale-lock predicate so two processes calling acquire
// concurrently are guaranteed to produce exactly one winner. Replaces the
// per-process in-memory flag that fell apart under multi-instance deploys.
export async function withJobLock<T>(
  name: string,
  options: JobLockOptions,
  fn: () => Promise<T>
): Promise<T | null> {
  const now = new Date();
  const heldUntil = new Date(now.getTime() + options.ttlMs);

  let acquired = false;
  try {
    const result = await JobLock.findOneAndUpdate(
      {
        name,
        $or: [
          { held_until: { $lt: now } },
          { holder: INSTANCE_ID },
        ],
      },
      {
        $set: {
          holder: INSTANCE_ID,
          acquired_at: now,
          held_until: heldUntil,
        },
        $setOnInsert: { name },
      },
      { upsert: true, new: true }
    ).catch((err: unknown) => {
      // Duplicate key means another instance won the upsert race. Treat as
      // "lock not acquired" and skip this tick.
      const code = (err as { code?: number } | null)?.code;
      if (code === 11000) return null;
      throw err;
    });

    if (!result || result.holder !== INSTANCE_ID) {
      return null;
    }
    acquired = true;

    return await fn();
  } finally {
    if (acquired) {
      await JobLock.deleteOne({ name, holder: INSTANCE_ID }).catch((err) =>
        logger.error(`Failed to release job lock "${name}":`, err)
      );
    }
  }
}
