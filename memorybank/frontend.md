# Memory Bank - Frontend (CLIENT)

## Tổng quan dự án

PR1AS Client là một ứng dụng frontend được xây dựng bằng Next.js 16 (App Router) + React 19 + TypeScript. Ứng dụng hỗ trợ đa ngôn ngữ (i18n), theme switching, state management với Zustand, và tích hợp với Ant Design UI library.

## Kiến trúc

### Cấu trúc thư mục

```
CLIENT/
├── app/                 # Next.js App Router
│   ├── admin/           # Admin routes
│   ├── auth/            # Authentication routes (login, register)
│   ├── worker/          # Worker routes
│   ├── components/      # Page-level components
│   ├── data/            # Mock data
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── lib/                 # Core libraries và utilities
│   ├── axios/           # API client configuration
│   ├── components/      # Reusable components
│   ├── hooks/           # Custom React hooks
│   ├── providers/       # Context providers
│   ├── stores/          # Zustand stores (state management)
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── messages/            # i18n translation files
│   ├── en.json
│   ├── ko.json
│   ├── vi.json
│   └── zh.json
├── styles/              # Global styles (SCSS)
├── i18n/                # i18n configuration
├── public/              # Static assets
└── docs/                # Documentation
```

## Công nghệ sử dụng

### Core Dependencies
- **next** (16.1.0) - React framework với App Router
- **react** (19.2.3) - UI library
- **react-dom** (19.2.3) - React DOM renderer
- **typescript** (^5) - TypeScript compiler

### UI & Styling
- **antd** (^6.1.1) - Ant Design component library
- **@ant-design/nextjs-registry** (^1.3.0) - Ant Design Next.js integration
- **sass** (^1.97.0) - SCSS preprocessor
- **tailwindcss** (^4) - Utility-first CSS framework
- **@tailwindcss/postcss** (^4) - PostCSS plugin

### State Management & Data Fetching
- **zustand** (^5.0.9) - Lightweight state management
- **@tanstack/react-query** (^5.90.12) - Server state management
- **@tanstack/react-query-devtools** (^5.91.1) - React Query devtools

### Internationalization
- **next-intl** (^4.6.1) - Next.js i18n
- **i18next** (^25.7.3) - i18n framework
- **react-i18next** (^16.5.0) - React bindings cho i18next
- **i18next-browser-languagedetector** (^8.2.0) - Language detection

### HTTP Client
- **axios** (^1.13.2) - HTTP client với interceptors

### Utilities
- **dayjs** (^1.11.19) - Date manipulation
- **lodash** (^4.17.21) - Utility library
- **zod** (^4.2.1) - Schema validation
- **use-debounce** (^10.0.6) - Debounce hook
- **next-nprogress-bar** (^2.4.7) - Progress bar

## Kiến trúc Layers

### 1. App Router (`app/`)
- Next.js 16 App Router structure
- File-based routing
- Layouts và nested layouts
- Server Components mặc định
- Client Components với `"use client"`

### 2. Components (`lib/components/`)
- Reusable UI components
- Ant Design components wrappers
- Theme-aware components
- Error boundaries

### 3. Hooks (`lib/hooks/`)
- Custom React hooks
- API hooks (`use-api.ts`)
- Auth hooks (`use-auth.ts`)
- Theme hooks (`use-theme.ts`)
- i18n hooks (`use-i18n.ts`)
- Currency hooks (`use-currency.ts`)
- Error handling hooks (`use-error-handler.ts`)

### 4. Stores (`lib/stores/`)
- Zustand stores cho global state
- Persisted stores với localStorage
- Stores: `auth.store.ts`, `theme.store.ts`, `locale.store.ts`, `currency.store.ts`

### 5. Providers (`lib/providers/`)
- React Context providers
- Ant Design provider (`antd-provider.tsx`)
- i18n provider (`i18n-provider.tsx`)
- React Query provider (`query-provider.tsx`)
- Combined providers (`index.tsx`)

### 6. Utils (`lib/utils/`)
- Error handling utilities
- i18n helpers
- General utilities

## State Management

### Zustand Stores

#### Auth Store (`lib/stores/auth.store.ts`)
- User information
- Authentication token
- Login/logout actions
- Persisted với localStorage
- Lắng nghe custom events từ axios interceptor

#### Theme Store (`lib/stores/theme.store.ts`)
- Theme mode (light/dark)
- Theme persistence

#### Locale Store (`lib/stores/locale.store.ts`)
- Current language
- Language switching

#### Currency Store (`lib/stores/currency.store.ts`)
- Currency selection
- Currency conversion

### React Query
- Server state management
- Caching và refetching
- Optimistic updates
- Error handling

## API Client

### Axios Configuration (`lib/axios/config.ts`)

#### Base Configuration
- Base URL: `process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"`
- Timeout: 30 seconds
- Credentials: `withCredentials: true`

#### Request Interceptor
- Tự động thêm JWT token vào Authorization header
- Token được lấy từ localStorage

#### Response Interceptor
- Xử lý 401 errors (unauthorized)
- Tự động logout và redirect về login
- Hiển thị error notifications
- Skip notifications với flag `skipErrorNotification`

#### API Response Format
```typescript
interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}
```

## Authentication Flow

### Login Process
1. User submits login form
2. API call đến `/api/auth/login`
3. Store token và user info trong Zustand store
4. Save token vào localStorage
5. Redirect to dashboard/home

### Logout Process
1. Clear Zustand store
2. Remove token từ localStorage
3. Redirect to login page
4. Axios interceptor cũng có thể trigger logout khi nhận 401

### Token Management
- Token được lưu trong localStorage
- Token được tự động thêm vào requests qua axios interceptor
- Token được sync giữa Zustand store và localStorage

## Internationalization (i18n)

### Supported Languages
- Vietnamese (vi) - Default
- English (en)
- Korean (ko)
- Chinese (zh)

### Translation Files
- Location: `messages/{locale}.json`
- Format: JSON với nested keys
- Comprehensive translations cho:
  - Common UI elements (buttons, labels, messages)
  - Error messages (network, HTTP, validation)
  - Authentication flows
  - Profile management
  - Worker setup process
  - Privacy policy và Terms of service
  - Home page content

### Usage
- Hook: `useI18n()` từ `lib/hooks/use-i18n.ts`
- Component: `useTranslations()` từ next-intl
- Language switching qua `locale.store.ts`

## Theming

### Theme System
- Light/Dark mode
- Ant Design theme integration
- CSS variables
- Persisted với localStorage

### Theme Store
- `useTheme()` hook
- Theme toggle component
- Auto-sync với system preference

## Error Handling

### Error Handler (`lib/utils/error-handler.ts`)
- Centralized error handling
- Error type detection
- Notification display
- Error logging

### Error Types
- Network errors
- Validation errors
- Server errors (4xx, 5xx)
- Unauthorized (401)

### Error Boundary (`lib/components/error-boundary.tsx`)
- React Error Boundary component
- Fallback UI
- Error reporting

## Styling

### SCSS
- Global styles: `app/globals.scss`
- Variables: `styles/_variables.scss`
- Reset: `styles/_reset.scss`

### Tailwind CSS
- Utility-first CSS
- PostCSS integration
- Custom configuration

### Ant Design
- Component library
- Theme customization
- Responsive design

## Custom Hooks

### `use-api.ts`
- API call wrapper
- Error handling
- Loading states

### `use-auth.ts`
- Authentication state
- Login/logout functions
- User information
- Auth guard functionality

### `use-theme.ts`
- Theme state
- Theme toggle function
- System preference detection

### `use-i18n.ts`
- i18n utilities
- Translation functions
- Language switching

### `use-currency.ts`
- Currency state
- Currency conversion
- Currency formatting

### `use-error-handler.ts`
- Error handling utilities
- Error notifications
- Error type detection

## Key Components

### `AvatarUpload` (`app/components/avatar-upload.tsx`)
- Avatar upload component
- Image cropping với antd-img-crop
- Preview functionality

### `Header` (`app/components/header.tsx`)
- Main navigation header
- Language switcher
- Theme toggle
- User menu
- "Become Worker" button

### `Footer` (`app/components/footer.tsx`)
- Site footer
- Links và company information

### `AuthGuard` (`lib/components/auth-guard.tsx`)
- Route protection component
- Redirects unauthenticated users
- Role-based access control

### `ErrorBoundary` (`lib/components/error-boundary.tsx`)
- React Error Boundary
- Fallback UI
- Error reporting

### `LanguageSwitcher` (`lib/components/language-switcher.tsx`)
- Language selection dropdown
- i18n integration

### `ThemeToggle` (`lib/components/theme-toggle.tsx`)
- Theme switching button
- Light/Dark mode toggle

## Wallet Integration

### Wallet API (`lib/api/wallet.api.ts`)
- Deposit với VNPay
- Balance management
- Transaction history
- Payment callback handling

### Wallet Pages
- Deposit page với preset amounts
- Payment callback page
- Balance display

Xem chi tiết: `memorybank/wallet.md`

## Chat/Messaging Integration

### Socket.IO Client (`lib/socket/`)
- Real-time messaging
- Event handling
- Connection management

### Chat API (`lib/api/chat.api.ts`)
- Send/receive messages
- Conversations management
- Read receipts
- Unread count

### Chat Pages
- Chat interface với conversation list
- Message view với real-time updates

Xem chi tiết: `memorybank/chat.md`

## Environment Variables

### Required Variables
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Optional Variables
```env
NEXT_PUBLIC_APP_NAME=PR1AS
NEXT_PUBLIC_DEFAULT_LOCALE=vi
```

## Routing

### App Router Structure
- `/` - Home page (public)
- `/auth/login` - Login page
- `/auth/register` - Register page
- `/privacy` - Privacy policy page
- `/terms` - Terms of service page
- `/client/profile` - Client profile page
- `/client/profile/edit` - Edit client profile
- `/client/wallet/deposit` - Deposit page với VNPay integration
- `/wallet/deposit/callback` - Payment callback page
- `/chat` - Chat page với conversation list và message view
- `/worker/setup` - Worker profile setup (multi-step)
  - Step 1: Basic information (location, personal details, gallery)
  - Step 2: Services selection và pricing
- `/admin/auth/login` - Admin login
- `/admin/dashboard` - Admin dashboard

### Layouts
- Root layout: `app/layout.tsx`
- Admin layout: `app/admin/layout.tsx`
- Nested layouts support

## Quy ước Coding

### Naming Conventions
- **Files**: kebab-case (ví dụ: `auth-modal.tsx`)
- **Components**: PascalCase (ví dụ: `AuthModal`)
- **Hooks**: camelCase với prefix "use" (ví dụ: `useAuth`)
- **Stores**: camelCase với suffix "Store" (ví dụ: `authStore`)
- **Types**: PascalCase (ví dụ: `User`, `ApiResponse`)

### File Structure
- Components trong `lib/components/`
- Hooks trong `lib/hooks/`
- Stores trong `lib/stores/`
- Types trong `lib/types/`
- Utils trong `lib/utils/`

### Component Patterns
- Server Components mặc định
- Client Components với `"use client"` directive
- Props typing với TypeScript interfaces
- Error boundaries cho error handling

### State Management
- Local state: `useState`
- Global state: Zustand stores
- Server state: React Query
- Form state: Ant Design Form hoặc React Hook Form

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm start        # Start production server
npm run lint     # Lint code
```

## Development Guidelines

1. Sử dụng TypeScript strict mode
2. Server Components mặc định, chỉ dùng Client Components khi cần
3. Sử dụng Zustand cho global state
4. Sử dụng React Query cho server state
5. Handle errors với error boundaries và error handlers
6. Validate API responses với Zod
7. Sử dụng Ant Design components
8. Follow i18n patterns cho tất cả text
9. Responsive design với Tailwind CSS
10. Optimize images và assets

## Performance Optimizations

1. **Next.js Image**: Sử dụng `next/image` cho images
2. **Code Splitting**: Automatic với Next.js
3. **Server Components**: Giảm JavaScript bundle size
4. **React Query**: Caching và deduplication
5. **Lazy Loading**: Dynamic imports cho heavy components
6. **Font Optimization**: Next.js font optimization
7. **Progress Bar**: next-nprogress-bar cho navigation feedback

## Worker Setup Flow

### Step 1: Basic Information
- Location (with geolocation API)
- Date of birth
- Gender selection
- Height và Weight
- Star sign selection
- Lifestyle description
- Hobbies (tag input)
- Introduction text
- Favorite quote
- Photo gallery (max 10 images, 5MB each)

### Step 2: Services Configuration
- Category selection (Assistance Services / Companionship Services)
- Service selection từ available services
- Pricing configuration:
  - Multiple pricing tiers per service
  - Unit selection (hour/day/month)
  - Duration và Price per unit
  - Add/remove pricing tiers

### Validation
- Step 1: All required fields must be filled
- Step 2: At least one service must be selected với pricing configured

## Security

1. **Environment Variables**: Chỉ expose `NEXT_PUBLIC_*` variables
2. **XSS Prevention**: React tự động escape
3. **CSRF Protection**: Cookies với SameSite
4. **Token Security**: HttpOnly cookies khi có thể
5. **Input Validation**: Zod schemas

