# SiteHeader — Cấu trúc & Hành vi

**File chính:** `pr1as-client/components/layout/site-header.tsx`  
**Store:** `pr1as-client/lib/store/services-header-store.ts`

---

## Tổng quan

`SiteHeader` là header sticky toàn trang. Nó có **hai chế độ layout** khác nhau tuỳ theo route hiện tại:

| Route | Layout |
|-------|--------|
| `/services` | 2-row expandable header (Airbnb-style) |
| Tất cả route khác | 1-row layout chuẩn |

---

## Chế độ 1: Standard Header (non-services)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo]   Dịch vụ · Bài viết (chỉ khi chưa login)   [Actions]  │  h-14
└──────────────────────────────────────────────────────────────────┘
```

- Layout: `flex justify-between`
- Logo + nav tabs (unauthenticated) bên trái
- Actions (role switch, theme, notification, avatar) bên phải
- Không có tab navigation dịch vụ

---

## Chế độ 2: Services Header (`/services`)

### Trạng thái Expanded (đầu trang, scrollY < 80px)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo]     🔔 Trợ lý    🤝 Đồng hành           [Actions]       │  Row 1 (h-16)
│                                                                  │
│        [ Dịch vụ │ Địa điểm │ Thời gian │ 🔍 Tìm kiếm ]        │  Row 2 (filter)
└──────────────────────────────────────────────────────────────────┘  ← border-b
```

### Trạng thái Collapsed (scrolled ≥ 80px)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Logo]  [ Địa điểm │ Thời gian │ Trợ lý 🔍 ]       [Actions]  │  Row 1 (h-16)
└──────────────────────────────────────────────────────────────────┘
```

Row 2 thu gọn với animation: `scaleY(1→0.75)` + `opacity(1→0)` + `max-height(96px→0)` trong 400ms.

### Trạng thái Manually Expanded (user click compact pill)

Giống Expanded nhưng **không auto-collapse** khi scroll. Collapse khi:
- User click ra ngoài header
- User scroll về đầu trang (scrollY < 80px) → reset về auto mode

---

## Cấu trúc Component Tree (Services Page)

```
<header> sticky top-0 z-40
└── <div ref={servicesHeaderRef}>              ← click-outside boundary

    ├── Row 1: grid grid-cols-[auto_1fr_auto] h-16
    │   ├── LEFT: <Link> Logo (brand name hoặc image)
    │   │
    │   ├── CENTER: <div> relative (overlapping layers)
    │   │   ├── Tab Nav (visible khi expanded)
    │   │   │   ├── 🔔 Trợ lý button      ← emoji + label, border-b-2 khi active
    │   │   │   └── 🤝 Đồng hành button   ← stagger animation 120ms delay
    │   │   │
    │   │   └── Compact Pill (visible khi collapsed)
    │   │       ← "Địa điểm │ Thời gian │ Trợ lý 🔍"
    │   │       ← onClick: expandHeader() — KHÔNG scroll về top
    │   │
    │   └── RIGHT: rightActions
    │       ├── Role Switch button (CLIENT↔WORKER)
    │       ├── ThemeToggle
    │       ├── NotificationBell
    │       └── Avatar + Dropdown Menu (z-50)
    │
    └── Row 2: filter slot (animated)
        └── <div ref={filterSlotRef} />    ← portal destination
            ← HomeHero portals desktop form vào đây
            ← animation: maxHeight + scaleY + opacity
```

---

## Filter Form — React Portal Architecture

Desktop filter form **không render trong page content** mà được **portal vào header** bằng `createPortal`.

```
HomeHero (page content)
  → createPortal(desktopForm, filterSlotEl)
  → renders INTO <div ref={filterSlotRef} /> trong header
```

**Flow:**
1. `SiteHeader` mount → `useLayoutEffect` → `setFilterSlotEl(filterSlotRef.current)` → store
2. `HomeHero` render → đọc `filterSlotEl` từ store → `createPortal(form, filterSlotEl)`
3. Desktop form hiện trong header; mobile form vẫn trong page content (`sm:hidden`)

**Lý do portal:** Filter form cần nằm trong sticky header container (DOM), nhưng state vẫn được quản lý bởi `HomeSearchExperience` ở page level — portal cho phép điều này không cần lift state.

---

## State Management — `useServicesHeaderStore`

**File:** `pr1as-client/lib/store/services-header-store.ts`

```typescript
{
  activeTab: ServiceTab           // "ASSISTANCE" | "COMPANIONSHIP"
  selectedLocationLabel: string | null   // hiển thị trong compact pill
  scheduledAtLabel: string | null        // hiển thị trong compact pill
  switchTabCallback: fn | null    // callback từ HomeSearchExperience
  isHeaderExpanded: boolean       // điều khiển expanded/collapsed
  filterSlotEl: HTMLElement | null // ref đến portal destination trong header

  // Setters
  setActiveTab, setSearchDisplay, setSwitchTabCallback,
  setHeaderExpanded, setFilterSlotEl
}
```

**Ai write / ai read:**

| Field | Writer | Reader |
|-------|--------|--------|
| `activeTab` | `HomeSearchExperience` | `SiteHeader` (compact pill label), `HomeHero` |
| `selectedLocationLabel` | `HomeSearchExperience` | `SiteHeader` (compact pill) |
| `scheduledAtLabel` | `HomeSearchExperience` | `SiteHeader` (compact pill) |
| `switchTabCallback` | `HomeSearchExperience` | `SiteHeader` (tab buttons) |
| `isHeaderExpanded` | `SiteHeader` (scroll + manual) | `SiteHeader` (animation), `HomeHero` (filter slot) |
| `filterSlotEl` | `SiteHeader` (useLayoutEffect) | `HomeHero` (createPortal) |

---

## Scroll Behavior Logic

```
scrollY < 80px:
  → setHeaderExpanded(true)
  → clear isManuallyExpanded flag

scrollY ≥ 80px + !isManuallyExpanded:
  → setHeaderExpanded(false)  → compact pill hiện

scrollY ≥ 80px + isManuallyExpanded:
  → giữ nguyên expanded (không làm gì)

Click compact pill:
  → isManuallyExpandedRef.current = true
  → setHeaderExpanded(true)   → expand tại chỗ, không scroll

Click outside (khi manually expanded):
  → isManuallyExpandedRef.current = false
  → setHeaderExpanded(false)
  → EXCEPT: click vào Radix popovers ([data-radix-popper-content-wrapper])
```

**Lý do dùng Ref song song với State cho `isManuallyExpanded`:**  
Scroll handler là closure cũ, không thấy React state mới. Dùng `isManuallyExpandedRef.current` để đọc giá trị mới nhất trong scroll handler mà không cần re-create listener.

---

## Tab Icon Animation

**Keyframe** (`app/globals.css`):
```css
@keyframes tab-icon-bounce {
  0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
  60%  { opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
```

**Easing:** `cubic-bezier(0.34, 1.56, 0.64, 1)` — spring easing, tự overshoot vượt scale(1) rồi bounce trở lại.

**Stagger:** Tab đầu delay 0ms, tab thứ hai delay 120ms.

Chạy **một lần duy nhất** khi component mount (animation-fill-mode: forwards, opacity ban đầu = 0 qua inline style).

---

## Mobile Behavior

- Header auto-hide (Instagram style): cuộn xuống → `-translate-y-full`, cuộn lên → hiện lại
- Tab nav và compact pill đều `hidden md:flex` — **chỉ hiện trên desktop**
- Filter form row 2 là `hidden md:block` — **chỉ hiện trên desktop**
- Mobile dùng `MobileSearch` (popover) + `ServiceTabs` nằm trong page content

---

## Files Liên Quan

```
pr1as-client/
├── components/layout/site-header.tsx          ← component chính
├── components/hero/home-hero.tsx              ← portals desktop form vào header
├── components/home/home-search-experience.tsx ← quản lý filter state, sync vào store
├── lib/store/services-header-store.ts         ← shared state giữa header & hero
├── lib/hooks/use-click-outside.ts             ← dùng cho avatar menu & collapse manual
└── app/globals.css                            ← @keyframes tab-icon-bounce
```
