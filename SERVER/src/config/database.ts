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
