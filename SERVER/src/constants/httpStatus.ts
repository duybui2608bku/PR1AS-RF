export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: "Internal Server Error",
  NOT_FOUND: "Route not found",
  DATABASE_NOT_INITIALIZED:
    "Database not initialized. Call connectDatabase() first.",
  SOCKET_NOT_INITIALIZED:
    "Socket.IO not initialized. Call initializeSocket() first.",
} as const;
