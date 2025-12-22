# Memory Bank - Tổng quan dự án PR1AS

## Giới thiệu

PR1AS là một ứng dụng full-stack được xây dựng với:
- **Backend**: Node.js + Express + TypeScript + MongoDB
- **Frontend**: Next.js 16 + React 19 + TypeScript

## Cấu trúc dự án

```
PR1AS-RF/
├── SERVER/              # Backend application
│   ├── src/            # Source code
│   ├── dist/           # Compiled JavaScript
│   ├── docs/           # API documentation
│   ├── logs/           # Log files
│   └── package.json
├── CLIENT/             # Frontend application
│   ├── app/            # Next.js App Router
│   ├── lib/            # Core libraries
│   ├── messages/       # i18n translations
│   ├── public/         # Static assets
│   └── package.json
└── memorybank/         # Memory bank files
    ├── backend.md
    ├── frontend.md
    └── project-overview.md
```

## Kiến trúc tổng thể

### Backend Architecture
```
Request → Routes → Middleware (Auth/Validation) → Controllers → Services → Repositories → Database
                                                                              ↓
Response ← Routes ← Controllers ← Services ← Repositories ← Database
```

### Frontend Architecture
```
User Interaction → Components → Hooks → API Client → Backend API
                                                          ↓
UI Update ← Components ← Hooks ← API Client ← Backend API
```

## Communication Flow

### API Communication
- **Protocol**: HTTP/HTTPS
- **Format**: JSON
- **Authentication**: JWT (Bearer token)
- **Base URL**: `http://localhost:3000/api` (development)

### Real-time Communication
- **Protocol**: WebSocket (Socket.IO)
- **Use Cases**: Real-time notifications, live updates

## Authentication Flow

1. User đăng nhập qua `/api/auth/login`
2. Server trả về JWT access token và refresh token
3. Frontend lưu token vào localStorage và Zustand store
4. Mỗi request tự động thêm token vào Authorization header
5. Server validate token qua `authenticate` middleware
6. Khi token hết hạn (401), frontend tự động logout và redirect

## User Roles

- **ADMIN**: Quản trị viên hệ thống
- **WORKER**: Người lao động (cung cấp dịch vụ)
- **CLIENT**: Khách hàng (sử dụng dịch vụ)

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Đăng ký tài khoản
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Users (`/api/users`)
- `GET /api/users` - Danh sách users (có pagination)
- `GET /api/users/:id` - Chi tiết user
- `PUT /api/users/:id` - Cập nhật user
- `DELETE /api/users/:id` - Xóa user

### Services (`/api/services`)
- `GET /api/services` - Danh sách services
- `GET /api/services/:id` - Chi tiết service
- `POST /api/services` - Tạo service (cần auth)
- `PUT /api/services/:id` - Cập nhật service
- `DELETE /api/services/:id` - Xóa service

## Database Schema

### User Model
- `_id`: ObjectId
- `email`: String (unique, required)
- `password`: String (hashed, required)
- `name`: String
- `roles`: Array<UserRole>
- `status`: UserStatus (ACTIVE, BANNED, INACTIVE)
- `worker_profile`: Object (optional)
- `createdAt`: Date
- `updatedAt`: Date

## Environment Setup

### Backend (.env)
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017
DB_NAME=pr1as
JWT_SECRET=your-secret-key
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRE=7d
CORS_ORIGIN=http://localhost:3001
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Development Workflow

### Backend Development
1. Start MongoDB
2. Copy `.env.example` to `.env` và config
3. `npm install`
4. `npm run dev` (hot reload với ts-node-dev)
5. API available tại `http://localhost:3000`

### Frontend Development
1. Copy `.env.example` to `.env.local` và config
2. `npm install`
3. `npm run dev`
4. App available tại `http://localhost:3001` (hoặc port khác)

## Testing

### Backend Testing
- Unit tests với Jest
- Integration tests cho API endpoints
- Test database riêng biệt

### Frontend Testing
- Component tests
- Integration tests
- E2E tests (nếu có)

## Deployment

### Backend Deployment
1. Build: `npm run build`
2. Start: `npm start`
3. Environment variables cần được set
4. MongoDB connection cần được config

### Frontend Deployment
1. Build: `npm run build`
2. Start: `npm start`
3. Hoặc deploy lên Vercel/Netlify
4. Environment variables cần được set

## Security Considerations

1. **JWT Tokens**: Secure secret keys, proper expiration
2. **Password Hashing**: bcrypt với salt rounds
3. **CORS**: Chỉ allow trusted origins
4. **Rate Limiting**: Prevent abuse
5. **Input Validation**: Validate tất cả inputs
6. **Error Handling**: Không expose sensitive info
7. **HTTPS**: Sử dụng trong production
8. **Environment Variables**: Không commit secrets

## Code Quality

### Backend
- TypeScript strict mode
- ESLint + Prettier
- Consistent code style
- Error handling patterns
- Logging với Winston

### Frontend
- TypeScript strict mode
- ESLint
- Component patterns
- Error boundaries
- Accessibility considerations

## Documentation

- **Backend API**: `SERVER/docs/`
- **Frontend Components**: Inline comments và JSDoc
- **Memory Bank**: `memorybank/`

## Common Patterns

### Backend Patterns
- Repository pattern cho data access
- Service layer cho business logic
- Middleware cho cross-cutting concerns
- Error handling với AppError class
- Response formatting với R.success/R.error

### Frontend Patterns
- Custom hooks cho reusable logic
- Zustand stores cho global state
- React Query cho server state
- Error boundaries cho error handling
- Component composition

## Future Enhancements

- [ ] Real-time notifications với Socket.IO
- [ ] File upload với multer
- [ ] Email service
- [ ] Payment integration
- [ ] Advanced search và filtering
- [ ] Analytics và reporting
- [ ] Mobile app (React Native)
- [ ] Admin dashboard improvements

