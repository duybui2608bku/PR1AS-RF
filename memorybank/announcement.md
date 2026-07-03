# Announcement System (Hệ thống Thông báo Admin)

## Tổng quan

Announcement system cho phép admin tạo thông báo phong phú (rich text + ảnh + redirect link) từ dashboard, lưu vào MongoDB, và hiển thị cho người dùng qua một generic `AnnouncementRenderer` component. Component hoạt động theo cơ chế **slot-based**: developer đặt component với một `placement` prop cố định, admin tự quản lý nội dung hiển thị tại slot đó mà không cần can thiệp code.

## Quyết định thiết kế chính

| Vấn đề | Quyết định |
|---|---|
| Component approach | **Slot-based** — prop `placement` (không hardcode ID) |
| Placement config | **Centralized config** — `config/announcement-placements.ts` |
| Dismissal persistence | **localStorage** keyed `ann_{userId}_{announcementId}` |
| Placements per announcement | **Multi-select array** — 1 thông báo hiển thị ở nhiều slot |
| Display types per announcement | **Multi-select array** — 1 thông báo render nhiều kiểu cùng lúc |
| Rich text editor | **TipTap** (`@tiptap/react` + extensions) |
| Click redirect | **Click toàn vùng** — wrap `onClick` ngoài content |

## Centralized Placement Config

**File duy nhất định nghĩa tất cả slots:** `pr1as-client/config/announcement-placements.ts`

```typescript
export const ANNOUNCEMENT_PLACEMENTS = [
  { value: "home_client",     label: "Trang chủ Client (/services)" },
  { value: "home_worker",     label: "Trang chủ Worker (/posts)" },
  { value: "services_banner", label: "Banner trang dịch vụ" },
  { value: "bookings_notice", label: "Thông báo trang bookings" },
  { value: "global_banner",   label: "Banner toàn cục (mọi trang)" },
] as const

export type PlacementValue = (typeof ANNOUNCEMENT_PLACEMENTS)[number]["value"]
```

**Workflow thêm slot mới:**
1. Thêm 1 entry vào `ANNOUNCEMENT_PLACEMENTS`
2. Đặt `<AnnouncementRenderer placement="new_slot" />` trong code
3. Admin form tự có thêm checkbox — không cần thay đổi UI

`AnnouncementRenderer` nhận `placement: PlacementValue` → TypeScript báo lỗi nếu dùng slot key sai.

---

## Backend Components

### Model (`SERVER/src/models/announcement/`)

`announcement.model.ts` — collection `announcements`:

```typescript
{
  title: string
  content: string            // HTML output từ TipTap editor
  images: string[]           // CDN URLs (ibytecdn.org)
  display_types: ('popup' | 'banner' | 'inline')[]   // ARRAY — nhiều kiểu cùng lúc
  display_behavior: 'always' | 'once_session' | 'once_device' | 'once_daily'
  target_roles: ('client' | 'worker' | 'all')[]
  placements: string[]       // ARRAY — nhiều slot cùng lúc, e.g. ["home_client", "home_worker"]
  redirect_url?: string      // URL redirect khi user click vào thông báo
  redirect_target: '_self' | '_blank'  // default: '_blank'
  is_active: boolean
  start_date?: Date
  end_date?: Date
  priority: number           // Sort order khi nhiều announcements cùng slot
  created_by: ObjectId       // ref 'users'
  created_at, updated_at: Date
  deleted: boolean           // soft delete
  deleted_at?: Date
}
```

Index: `{ placements: 1, is_active: 1, deleted: 1 }`.

MongoDB array query để lọc theo slot: `{ placements: "home_client" }` — match document có "home_client" trong array.

### Repository (`SERVER/src/repositories/announcement/`)

- `findActiveByPlacement(placement)` — `{ placements: placement, is_active: true, deleted: false, $and: [...date range] }`, sort priority desc → first result
- `findAll(query)` — paginated, filter by `placements: query.placement` khi có
- `findById(id)`, `create(data)`, `update(id, patch)`, `softDelete(id)`

### Service (`SERVER/src/services/announcement/`)

- `getActiveByPlacement(placement)` — public
- `list(query)`, `getById(id)`, `create(dto, adminId)`, `update(id, dto)`, `delete(id)`

### Controller Zod Schemas

```typescript
// Create
display_types: z.array(z.nativeEnum(AnnouncementDisplayType)).min(1)
placements:    z.array(z.string().min(1).max(100)).min(1)

// Update (optional)
display_types: z.array(z.nativeEnum(AnnouncementDisplayType)).min(1).optional()
placements:    z.array(z.string().min(1).max(100)).min(1).optional()
```

### Routes

Base path: `/api`

**Public (authenticated):**
- `GET /announcements/by-placement?placement=:slot`

**Admin:**
- `GET    /admin/announcements`
- `GET    /admin/announcements/:id`
- `POST   /admin/announcements`
- `PATCH  /admin/announcements/:id`
- `DELETE /admin/announcements/:id`

Middleware: `authenticate` + `adminOnly` + `csrfProtection` (write routes).

---

## Frontend Components (`pr1as-client`)

### Service: `services/announcement.service.ts`

```typescript
export type Announcement = {
  id: string
  display_types: DisplayType[]   // array
  placements: string[]           // array
  // ... other fields
}

export type CreateAnnouncementInput = {
  display_types: DisplayType[]   // required
  placements: string[]           // required
  // ... other fields optional
}
```

### Query Keys: `lib/query-keys.ts`

```typescript
announcements: {
  all: ['announcements'],
  byPlacement: (placement) => ['announcements', 'placement', placement],
  admin: {
    all: ['announcements', 'admin'],
    list: (params?) => ['announcements', 'admin', 'list', params],
    detail: (id) => ['announcements', 'admin', 'detail', id],
  }
}
```

### Hooks: `lib/hooks/use-announcements.ts`

- `useAnnouncementByPlacement(placement)` — public query, staleTime 5min
- `useAdminAnnouncements(params)`, `useAdminAnnouncement(id)`
- `useCreateAnnouncement()`, `useUpdateAnnouncement()`, `useDeleteAnnouncement()` — mutations với toast + invalidateQueries

### Utility: `lib/utils/announcement-dismissal.ts`

```typescript
shouldShowAnnouncement(announcement, userId): boolean
// 'always' → true
// 'once_device' → !localStorage.getItem(key)
// 'once_session' → !sessionStorage.getItem(key)
// 'once_daily' → !stored || Date.now() - parseInt(stored) > 86_400_000

dismissAnnouncement(announcement, userId): void
// Lưu timestamp vào localStorage/sessionStorage theo display_behavior
// 'always' → noop
```

### Component Tree

```
components/announcement/
  index.ts
  AnnouncementRenderer.tsx   ← Orchestrator, nhận placement: PlacementValue
  AnnouncementContent.tsx    ← Render HTML + click-to-redirect wrapper
  AnnouncementPopup.tsx      ← Dialog (mobile: BottomSheet)
  AnnouncementBanner.tsx     ← Sticky top bar
  AnnouncementInline.tsx     ← Card inline
```

**AnnouncementRenderer logic:**
1. `useAnnouncementByPlacement(placement)` fetch data
2. Kiểm tra `shouldShowAnnouncement(announcement, userId)` một lần
3. Map qua `announcement.display_types` → render **tất cả** variant cùng lúc
4. `dismissAnnouncement` dismiss tất cả variants cùng lúc

```tsx
{announcement.display_types.map((displayType) => {
  switch (displayType) {
    case "popup":  return <AnnouncementPopup  key="popup"  ... />
    case "banner": return <AnnouncementBanner key="banner" ... />
    case "inline": return <AnnouncementInline key="inline" ... />
  }
})}
```

**AnnouncementContent — click redirect:**
- Nếu `redirect_url` tồn tại: wrap toàn bộ content trong `<div onClick={() => window.open(url, target)}>` với `cursor-pointer`
- Link trong TipTap HTML content: `stopPropagation` để tránh double-redirect

### Responsive

| Component | Mobile | Desktop |
|---|---|---|
| Popup | `BottomSheet` (Radix Dialog) `max-h-[85svh]` | Centered modal `max-w-lg max-h-[80vh]` |
| Banner | Title only + expand/collapse toggle | Full content, flex row |
| Inline | Layout dọc, ảnh `aspect-video` full-width | Layout ngang `md:flex-row`, ảnh `md:w-48` |
| Admin table | Card list (`AnnouncementCard`) | Table với 8 columns |

### TipTap Editor: `components/ui/tiptap-editor.tsx`

Extensions: StarterKit, Color, `{ TextStyle }` (named import — không phải default), Image, Link, TextAlign, Underline, Placeholder.
Image upload tích hợp `lib/utils/upload-image.ts` (CDN ibytecdn.org).
Props: `value: string`, `onChange: (html: string) => void`, `placeholder?`, `className?`, `minHeight?`.

> **Lưu ý**: Import `{ TextStyle }` (named), KHÔNG dùng `import TextStyle from` — gây TS error "has no default export".

### Admin Dashboard Page: `app/dashboard/announcements/page.tsx`

Form state:
```typescript
type FormState = {
  placements: string[]           // multi-select checkboxes từ ANNOUNCEMENT_PLACEMENTS
  customPlacementInput: string   // input thêm slot tùy chỉnh (add → push vào placements[])
  display_types: DisplayType[]   // multi-select checkbox cards
  // ... other fields
}
```

UI cho placements: Checkbox grid từ `ANNOUNCEMENT_PLACEMENTS` + input thêm slot tùy chỉnh với tag removable.
UI cho display_types: 3 card có checkbox (Popup / Banner / Inline), click card = toggle.

Table columns: Tiêu đề | Slots (multiple `<code>` chips) | Kiểu hiển thị (multiple `<Badge>`) | Hành vi | Đối tượng | Trạng thái | Ngày tạo | Thao tác.

Filter bằng Select (vị trí / trạng thái), clear filter button.

### Placement trong user pages

- `app/services/page.tsx` → `<AnnouncementRenderer placement="home_client" />`
- `app/posts/page.tsx` → `<AnnouncementRenderer placement="home_worker" />`

---

## File Structure

```
SERVER/src/
  constants/announcement.ts
  types/announcement.ts
  models/announcement/announcement.model.ts
  repositories/announcement/announcement.repository.ts
  services/announcement/announcement.service.ts
  controllers/announcement/announcement.controller.ts
  routes/announcement/announcement.routes.ts

pr1as-client/
  config/announcement-placements.ts         ← Single source of truth cho slots
  services/announcement.service.ts
  lib/query-keys.ts                         (thêm announcements keys)
  lib/utils/announcement-dismissal.ts
  lib/hooks/use-announcements.ts
  components/ui/tiptap-editor.tsx
  components/announcement/
    index.ts
    AnnouncementRenderer.tsx
    AnnouncementContent.tsx
    AnnouncementPopup.tsx
    AnnouncementBanner.tsx
    AnnouncementInline.tsx
  app/dashboard/announcements/page.tsx
  components/layout/admin-dashboard-shell.tsx  (thêm sidebar item)
```

## Packages đã cài (pr1as-client)

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
  @tiptap/extension-color @tiptap/extension-text-style \
  @tiptap/extension-image @tiptap/extension-link \
  @tiptap/extension-text-align @tiptap/extension-underline \
  @tiptap/extension-placeholder
```

## Verification

1. API: POST create (arrays) → GET by-placement → toggle is_active → DELETE soft delete
2. Admin UI: tạo thông báo với nhiều placements + nhiều display_types → lưu, xem table columns hiển thị đúng
3. User display: Login as client → `/services` → tất cả display_types được render cùng lúc
4. Dismiss: đóng một variant → reload → không hiện lại (once_device)
5. Multi-slot: thông báo có `placements: ["home_client", "home_worker"]` → hiện ở cả 2 trang
6. Click redirect: click vào bất kỳ vùng nào → mở đúng URL / target
7. Config sync: thêm slot mới vào `config/announcement-placements.ts` → admin form tự có option
8. TypeScript: `npm run typecheck` — no errors; slot key sai → compile error
