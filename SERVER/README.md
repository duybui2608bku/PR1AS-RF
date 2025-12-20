# PR1AS Server

Node.js + TypeScript Server Application

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Start Production

```bash
npm start
```

## Dependencies

### Core
- **express** - Web framework
- **dotenv** - Environment variables management
- **cors** - Cross-Origin Resource Sharing
- **helmet** - Security headers
- **compression** - Response compression
- **cookie-parser** - Cookie parsing middleware
- **morgan** - HTTP request logger

### Authentication & Security
- **jsonwebtoken** - JWT authentication
- **bcrypt** - Password hashing
- **express-rate-limit** - Rate limiting

### Validation
- **zod** - Schema validation (type-safe)
- **express-validator** - Express validation middleware
- **class-validator** - Decorator-based validation
- **class-transformer** - Object transformation

### Logging
- **winston** - Logging library

### Date & Time
- **dayjs** - Lightweight date manipulation library

### Utilities
- **lodash** - JavaScript utility library

### Database
- **mongodb** - MongoDB driver for Node.js

### Real-time Communication
- **socket.io** - Real-time bidirectional event-based communication

## Project Structure

```
src/
├── config/         # Configuration files
├── controllers/    # Request handlers
├── middleware/     # Express middleware (auth, errorHandler)
├── models/         # Data models
├── routes/         # API routes
├── services/       # Business logic
├── types/          # TypeScript type definitions
├── utils/          # Utility functions (logger, jwt, bcrypt, validation, date, lodash)
└── index.ts        # Application entry point
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
MONGODB_URI=mongodb://localhost:27017
DB_NAME=pr1as_db
```

## Features

- ✅ TypeScript with strict mode
- ✅ Express.js server
- ✅ Environment variables (dotenv)
- ✅ Security (helmet, CORS)
- ✅ Logging (Winston + Morgan)
- ✅ JWT Authentication
- ✅ Password hashing (bcrypt)
- ✅ Request validation (Zod)
- ✅ Rate limiting
- ✅ Error handling middleware
- ✅ Request compression
- ✅ MongoDB integration
- ✅ Socket.IO real-time communication
- ✅ Date manipulation (dayjs)
- ✅ Utility functions (lodash)

