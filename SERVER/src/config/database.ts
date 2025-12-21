import mongoose from "mongoose";
import { logger } from "../utils/logger";
import { config } from "./index";

export const connectDatabase = async (): Promise<void> => {
  try {
    // Đảm bảo URI không có database name ở cuối
    let baseUri = config.mongodbUri.trim();
    // Loại bỏ database name nếu có trong URI
    if (baseUri.includes("/") && !baseUri.endsWith("/")) {
      const lastSlashIndex = baseUri.lastIndexOf("/");
      const afterLastSlash = baseUri.substring(lastSlashIndex + 1);
      // Nếu phần sau dấu / không phải là port hoặc query params, có thể là database name
      if (!afterLastSlash.includes("?") && !afterLastSlash.includes(":")) {
        baseUri = baseUri.substring(0, lastSlashIndex);
      }
    }

    // Tạo URI với database name
    const uri = `${baseUri}/${config.dbName}`;

    await mongoose.connect(uri, {
      dbName: config.dbName, // Chỉ định rõ database name trong options
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
