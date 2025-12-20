import mongoose from "mongoose";
import { logger } from "../utils/logger";
import { config } from "./index";

export const connectDatabase = async (): Promise<void> => {
  try {
    const uri = `${config.mongodbUri}/${config.dbName}`;
    await mongoose.connect(uri);
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
