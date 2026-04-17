# Shared Hooks Documentation

## useMobile
**File**: `lib/hooks/use-mobile.ts`

Replaces the copy-pasted `useState(false)` + `useEffect(resize listener)` pattern.

```tsx
// Before (10 lines lặp lại ở 4+ files)
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 768);
  handleResize();
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);

// After (1 line)
const isMobile = useMobile();
```

**Used in**: `chat/page.tsx`, `worker/bookings/page.tsx`

---

## usePagination
**File**: `lib/hooks/use-pagination.ts`

Replaces the duplicated `[page, setPage]` + `[limit, setLimit]` + `handleTableChange` pattern.

```tsx
// Before (mỗi file phải khai báo 3 state + 1 handler)
const [page, setPage] = useState(PAGINATION_DEFAULTS.PAGE);
const [limit, setLimit] = useState(PAGINATION_DEFAULTS.LIMIT);
const handleTableChange = (p, s) => { setPage(p); setLimit(s); };

// After (destructured từ hook)
const { page, limit, handleTableChange, resetPage } = usePagination();
```

---

## useStandardizedMutation
**File**: `lib/hooks/use-standardized-mutation.ts`

Standard mutation wrapper với auto error handling via `useErrorHandler()`.

```tsx
const myMutation = useStandardizedMutation(
  (data: MyInput) => myApi.doSomething(data),
  {
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["my-key"] });
      message.success("Thành công!");
    },
    skipErrorNotification: false, // default: false (auto show error)
  }
);
```

**Rule**: Tất cả mutations phải dùng `useStandardizedMutation` thay vì raw `useMutation`.

---

## useApiMutation & useApiQuery
**File**: `lib/hooks/use-api.ts`

Generic URL-based hooks cho simple CRUD operations.

```tsx
// Query
const { data } = useApiQuery<MyType>(["key"], "/api/endpoint");

// Mutation  
const mutation = useApiMutation<ResponseType, InputType>("/api/endpoint", "POST");
```

> **Note**: `useApiMutation` đã được fix — không còn `queryClient.invalidateQueries()` blanket nữa.
> Caller phải tự specify invalidation target trong `onSuccess`.
