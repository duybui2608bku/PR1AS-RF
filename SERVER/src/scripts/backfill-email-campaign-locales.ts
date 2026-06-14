/**
 * Backfill multi-language fields on existing email campaigns.
 *
 * Campaigns created before multi-language support stored `subject` and
 * `html_content` as flat strings. The new schema expects per-locale objects
 * ({ vi, en, zh }) plus a `default_locale`. This wraps each legacy string into
 * the default locale slot so existing campaigns keep rendering unchanged.
 * Idempotent: documents whose `subject` is already an object are skipped.
 *
 * Run:  npx ts-node src/scripts/backfill-email-campaign-locales.ts
 */
import "dotenv/config";
import {
  connectDatabase,
  closeDatabase,
  getConnection,
} from "../config/database";
import { modelsName } from "../models/models.name";
import { DEFAULT_CAMPAIGN_LOCALE } from "../constants/email-campaign";
import { logger } from "../utils/logger";

async function backfillEmailCampaignLocales(): Promise<void> {
  // Operate on the raw collection so we can read the legacy string shape
  // without fighting the new Mongoose schema types.
  const collection = getConnection().collection(modelsName.EMAIL_CAMPAIGN);
  const cursor = collection.find({});
  let updated = 0;

  for await (const doc of cursor) {
    const subject = doc.subject;
    const html = doc.html_content;
    const needsSubject = typeof subject === "string";
    const needsHtml = typeof html === "string";
    if (!needsSubject && !needsHtml && doc.default_locale) continue;

    const set: Record<string, unknown> = {};
    if (needsSubject) set.subject = { [DEFAULT_CAMPAIGN_LOCALE]: subject };
    if (needsHtml) set.html_content = { [DEFAULT_CAMPAIGN_LOCALE]: html };
    if (!doc.default_locale) set.default_locale = DEFAULT_CAMPAIGN_LOCALE;

    await collection.updateOne({ _id: doc._id }, { $set: set });
    updated += 1;
  }

  // Legacy send logs predate per-recipient locale tracking.
  await getConnection()
    .collection(modelsName.EMAIL_SEND_LOG)
    .updateMany(
      { locale: { $exists: false } },
      { $set: { locale: DEFAULT_CAMPAIGN_LOCALE } }
    );

  logger.info(
    `Backfill done: ${updated} email campaign(s) migrated to multi-language.`
  );
}

async function main(): Promise<void> {
  await connectDatabase();
  try {
    await backfillEmailCampaignLocales();
  } finally {
    await closeDatabase();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Email campaign locale backfill failed:", error);
    process.exit(1);
  });
