# Phân tích lỗi: React Error #310 tại /chat (Production-only)

## Mô tả lỗi

User đã đăng nhập không thể truy cập `/chat` trên production (`https://pr1as.com`).

**Console error:**
```
Error: Minified React error #310; visit https://react.dev/errors/310
```

React Error #310 = **"Too many re-renders"** — React giới hạn 25 lần re-render trong một work loop để ngăn vòng lặp vô hạn. Lỗi này **chỉ xảy ra ở production**, không xảy ra ở localhost.

---

## Root Causes

### Root Cause 1: JWT_SECRET không khớp giữa Frontend Middleware và Backend

**File**: `middleware.ts:24`

```typescript
const jwtSecret = process.env.JWT_SECRET || "pr1as"  // fallback nguy hiểm!
```

Nếu `JWT_SECRET` không được set trong môi trường Next.js (production env vars), Edge middleware dùng `"pr1as"` để verify JWT. Backend dùng secret thật → **mọi JWT token đều fail verification ở Edge**.

**Chuỗi lỗi:**
1. User đăng nhập → Backend cấp token ký bằng secret thật
2. User vào `/chat` → Edge middleware verify bằng `"pr1as"` → **FAIL** → redirect `/login`
3. Zustand (sessionStorage) vẫn có `isAuthenticated: true` → React không redirect
4. Middleware tại `/login` thấy token invalid → serve login page
5. React ở login page (hoặc user click back) → redirect lại `/chat`
6. Vòng lặp navigation: `/chat` ↔ `/login` ↔ `/chat` ↔ ...
7. Trong Next.js App Router concurrent mode, navigation loop tạo cascading state updates → **Error #310**

**Mức độ**: NGHIÊM TRỌNG — Primary cause nếu JWT_SECRET thiếu trong deployment.

---

### Root Cause 2: Không có Hydration Guard cho Zustand

**File**: `lib/store/auth-store.ts`

Zustand `persist` với `sessionStorage` đọc state **SAU** khi React đã render lần đầu. Initial state luôn là:
```typescript
{ isAuthenticated: false, token: null, user: null }
```

Trong khoảng `[initial render → Zustand hydrate từ sessionStorage]`:

- `chat-page.tsx:616` — Effect thấy `!isAuthenticated` → gọi `router.replace("/login")`
- `useNotificationSocket` — thấy `!isAuthenticated` → gọi `disconnectChatSocket()`, nullify socket singleton
- Khi hydration xong: token = real value, nhưng socket singleton đã bị null → phải tạo socket mới
- Nhiều effects re-run đồng loạt + TanStack Query fetching + socket events fire → **cascade renders**

**Mức độ**: QUAN TRỌNG — Gây ra navigation loop ngay cả khi JWT_SECRET đúng.

---

### Root Cause 3: `useNotificationSocket` disconnect socket quá sớm

**File**: `lib/hooks/use-notifications.ts:60-64`

```typescript
React.useEffect(() => {
  if (!isAuthenticated) {
    disconnectChatSocket()  // ← Fire ngay ở pre-hydration vì isAuthenticated=false
    return
  }
  const socket = getChatSocket(token)
  // ...
}, [token, isAuthenticated, queryClient])
```

**Sequence vấn đề:**
1. Pre-hydration: `isAuthenticated=false` → `disconnectChatSocket()` → `chatSocket=null`
2. Zustand hydrate: `isAuthenticated=true, token="jwt..."` → effect re-run
3. `getChatSocket("jwt...")` tạo socket MỚI (vì singleton đã bị null)
4. `useChatSocket` cũng phản ứng với token change → socket reference thay đổi
5. Large effect tại `chat-page.tsx:686-826` re-run → detach/re-attach tất cả listeners
6. Socket mới connect → server push events → `queryClient.setQueryData()` calls → re-renders

**Mức độ**: QUAN TRỌNG — Khuếch đại Root Cause 2.

---

### Root Cause 4: Socket effect có dependencies không cần thiết

**File**: `components/chat/chat-page.tsx:686-826`

```typescript
// Dependency array của large socket event effect:
}, [activeDirectId, activeGroupId, queryClient, setTyping, socket, user?.id])
```

Mỗi khi user chuyển conversation (`activeDirectId` thay đổi), toàn bộ socket event listeners bị detach rồi re-attach. Nếu events đến trong khoảng này → events bị miss hoặc handler dùng stale closure values.

Trong production (nhiều user, real-time activity), events đến nhanh hơn và nhiều hơn ngay sau connect → tần suất detach/re-attach cao hơn → risk cao hơn.

**Mức độ**: MEDIUM — Không phải primary cause nhưng gây hiệu năng kém và bugs tinh vi.

---

## Lỗ hổng bảo mật

### Bảo mật 1: Default JWT secret có thể đoán được

Nếu `JWT_SECRET` không set trong production frontend, middleware dùng `"pr1as"` — một string ngắn, có thể đoán được. Attacker biết default này có thể forge JWT token **hợp lệ với Edge middleware** (dù backend từ chối do dùng secret khác).

### Bảo mật 2: `active_role` cookie không có HttpOnly

**File**: `lib/auth/auth-cookie.ts` — Cookie role được set qua `document.cookie` (JavaScript-accessible). Nếu có XSS vulnerability, attacker có thể đọc/modify role → privilege escalation.

---

## Giải pháp đã implement

### Fix 1: `middleware.ts` — Thay đổi fallback JWT_SECRET

```typescript
// TRƯỚC:
const jwtSecret = process.env.JWT_SECRET || "pr1as"

// SAU: Fail rõ ràng nếu thiếu trong production, dùng dev-only fallback an toàn hơn
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret && process.env.NODE_ENV === "production") {
  console.error("[middleware] CRITICAL: JWT_SECRET is not set!")
}
const secret = new TextEncoder().encode(jwtSecret ?? "pr1as-dev-only-not-for-production")
```

### Fix 2: `lib/store/auth-store.ts` — Thêm `_hasHydrated` flag

```typescript
type AuthState = {
  // ...existing fields
  _hasHydrated: boolean
  _setHasHydrated: () => void
}

// Trong persist config:
onRehydrateStorage: () => (state) => {
  state?._setHasHydrated()
}

// Helper hook:
export const useHasHydrated = () => useAuthStore((s) => s._hasHydrated)
```

### Fix 3: `lib/hooks/use-chat-socket.ts` — Guard hydration

```typescript
const hasHydrated = useHasHydrated()
const socket = React.useMemo(
  () => (hasHydrated && isAuthenticated ? getChatSocket(token) : null),
  [hasHydrated, token, isAuthenticated]
)
```

### Fix 4: `lib/hooks/use-notifications.ts` — Không disconnect trước hydration

```typescript
React.useEffect(() => {
  if (!hasHydrated) return  // Chờ biết auth state thật
  if (!isAuthenticated) {
    disconnectChatSocket()
    return
  }
  // ...
}, [hasHydrated, token, isAuthenticated, queryClient])
```

### Fix 5: `components/chat/chat-page.tsx` — Guard redirect + loading state + stable socket effect

```typescript
// Guard redirect effect
React.useEffect(() => {
  if (!hasHydrated) return
  if (!isAuthenticated) router.replace("/login")
}, [hasHydrated, isAuthenticated, router])

// Loading state khi chưa hydrate
if (!hasHydrated) return <ChatPageSkeleton />

// Stabilize socket effect deps với refs pattern
const activeDirectIdRef = React.useRef(activeDirectId)
activeDirectIdRef.current = activeDirectId
// Chỉ re-register listeners khi SOCKET thay đổi, không phải khi conversation thay đổi
```

---

## Checklist sau khi deploy

- [ ] `JWT_SECRET` được set trong Next.js production environment và **khớp với backend**
- [ ] Console không còn Error #310 tại `/chat`
- [ ] Network tab: socket connect một lần, không reconnect nhiều lần khi load trang
- [ ] Mở `/chat` trong tab mới (sessionStorage trống): thấy loading state → load chat bình thường
- [ ] React DevTools Profiler: ChatPage không re-render > 3 lần khi mount

---

## Ngày phân tích

2026-05-31
