import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import { logger } from "../utils/logger";
import { config } from "./index";
import { ERROR_MESSAGES } from "../constants/httpStatus";

let io: SocketServer | null = null;

export const initializeSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: config.socket.methods,
      credentials: config.corsCredentials,
    },
    pingTimeout: config.socket.pingTimeout,
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });

    // Example: Join room
    socket.on("join-room", (roomId: string) => {
      socket.join(roomId);
      logger.info(`Socket ${socket.id} joined room: ${roomId}`);
    });

    // Example: Leave room
    socket.on("leave-room", (roomId: string) => {
      socket.leave(roomId);
      logger.info(`Socket ${socket.id} left room: ${roomId}`);
    });
  });

  logger.info("Socket.IO initialized");
  return io;
};

export const getSocketIO = (): SocketServer => {
  if (!io) {
    throw new Error(ERROR_MESSAGES.SOCKET_NOT_INITIALIZED);
  }
  return io;
};
