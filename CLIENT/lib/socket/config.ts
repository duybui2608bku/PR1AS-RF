"use client";

import { io, Socket } from "socket.io-client";
import { SocketEvent } from "../constants/socket-events";

const SOCKET_BASE_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:3052/api";

let socketInstance: Socket | null = null;

export const getSocket = (): Socket | null => {
  if (typeof window === "undefined") {
    return null;
  }

  if (socketInstance?.connected) {
    return socketInstance;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    return null;
  }

  socketInstance = io(SOCKET_BASE_URL, {
    auth: {
      token,
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  if (typeof window !== "undefined") {
    window.addEventListener("auth:token-refreshed", ((
      event: CustomEvent<{ token: string }>
    ) => {
      const { token } = event.detail;
      if (socketInstance) {
        socketInstance.auth = { token };
        socketInstance.disconnect();
        socketInstance.connect();
      }
    }) as EventListener);

    window.addEventListener("auth:logout", () => {
      disconnectSocket();
    });
  }

  return socketInstance;
};

export const disconnectSocket = (): void => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export const reconnectSocket = (): void => {
  disconnectSocket();
  getSocket();
};
