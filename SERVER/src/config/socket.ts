import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import { logger } from "../utils/logger";
import { config } from "./index";
import { ERROR_MESSAGES } from "../constants/httpStatus";
import { authenticateSocket, setupChatHandlers } from "./socket.handlers";

let io: SocketServer | null = null;

const getSocketCorsOrigin = () => {
  const envOrigin = process.env.CORS_ORIGIN;
  if (envOrigin) {
    return envOrigin.includes(",")
      ? envOrigin.split(",").map((o) => o.trim())
      : envOrigin;
  }

  if (process.env.NODE_ENV !== "production") {
    return (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (
        !origin ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    };
  }

  return "http://localhost:3000";
};

export const initializeSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: getSocketCorsOrigin(),
      methods: config.socket.methods,
      credentials: config.corsCredentials,
    },
    pingTimeout: config.socket.pingTimeout,
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    setupChatHandlers(socket);
    
    socket.on("error", (error) => {
      logger.error(`Socket error on ${socket.id}:`, error);
    });
  });

  logger.info("Socket.IO initialized with authentication");
  return io;
};

export const getSocketIO = (): SocketServer => {
  if (!io) {
    throw new Error(ERROR_MESSAGES.SOCKET_NOT_INITIALIZED);
  }
  return io;
};
