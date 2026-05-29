import mongoose from "mongoose";
import { logger } from "../utils/logger";
import { config } from "./index";

export const connectDatabase = async (): Promise<void> => {
  try {
    let baseUri = config.mongodbUri.trim();
    if (baseUri.includes("/") && !baseUri.endsWith("/")) {
      const lastSlashIndex = baseUri.lastIndexOf("/");
      const afterLastSlash = baseUri.substring(lastSlashIndex + 1);
      if (!afterLastSlash.includes("?") && !afterLastSlash.includes(":")) {
        baseUri = baseUri.substring(0, lastSlashIndex);
      }
    }

    const uri = `${baseUri}/${config.dbName}`;

    await mongoose.connect(uri, {
      dbName: config.dbName,
    });

    logger.info(`Connected to MongoDB: ${config.dbName}`);
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    throw error;
  }
};

// Reconcile every registered model's indexes with its schema. syncIndexes
// drops indexes that are no longer declared and creates missing ones — this is
// what lets an index whose *options* changed (e.g. a plain field index turned
// into a TTL index) actually update, since createIndex alone would throw
// IndexOptionsConflict on the existing index. Failures are logged per-model so
// one bad collection never blocks server startup.
export const syncAllIndexes = async (): Promise<void> => {
  const models = mongoose.connection.models;
  await Promise.all(
    Object.values(models).map(async (model) => {
      try {
        await model.syncIndexes();
      } catch (error) {
        logger.error(`Failed to sync indexes for "${model.modelName}":`, error);
      }
    })
  );
  logger.info(`Synced indexes for ${Object.keys(models).length} model(s)`);
};

export const closeDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");
  } catch (error) {
    logger.error("Error closing MongoDB connection:", error);
    throw error;
  }
};

export const getConnection = () => mongoose.connection;
