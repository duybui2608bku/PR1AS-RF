# Service Lifecycle & Admin Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins full CRUD over the service catalog with a safe lifecycle (deprecate/reactivate/guarded hard-delete), and keep worker profiles discoverable as the catalog changes via a two-tier opt-in notification strategy.

**Architecture:** Reuse the existing `Service.is_active` flag as the deprecation signal (Approach A from the spec). Add admin-only `/admin/services` endpoints backed by a dedicated `AdminServiceService` that orchestrates repository writes plus notifications. Hard-delete is blocked by a reference-count guardrail (WorkerService + Booking). New services notify all active workers in-app; a pull-based banner on the worker setup page is the primary opt-in driver.

**Tech Stack:** Node.js + Express + TypeScript + Mongoose (backend, jest + ts-jest tests); Next.js 16 App Router + React 19 + TanStack Query + axios + shadcn/ui (frontend).

## Global Constraints

- Backend `tsconfig` is `strict` **and** enforces `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch` — no unused imports/params or the build fails.
- All HTTP responses go through the `R` helper (`utils/response`), never `res.json` directly.
- Request bodies validated with Zod schemas in `validations/`; use `validateWithSchema(schema, payload, message)`.
- Errors thrown as `AppError` (`utils/AppError`); handled by the global error middleware.
- Backend layering is strict: `routes → controllers → services → repositories → models`. All DB access lives in repositories.
- State-changing admin routes require `authenticate`, `adminOnly`, and `...csrfProtection` middleware.
- Frontend: no semicolons; Tailwind classes only; `const` arrow functions with types; event handlers prefixed `handle*`; include a11y attributes. TanStack Query hooks in `lib/hooks/use-*.ts`; query keys in `lib/query-keys.ts`; axios calls in `services/*.ts`.
- i18n locales are `vi` (default), `en`, `zh`, `ko`. Server notification strings live in `src/utils/i18n.ts` and must include all four locales. Default send locale for bulk notifications is `vi`.
- Conventional Commits: `<type>[scope]: <description>`, imperative, no trailing period.
- The client app has **no test runner**; frontend tasks are verified with `npm run typecheck` + a manual browser check, not unit tests.

---

## File Structure

**Backend (`SERVER/`):**
- `src/types/common/error.types.ts` — MODIFY: add 3 error codes.
- `src/types/service/service.type.ts` — MODIFY: add lifecycle fields to `IServiceDocument` + new input types.
- `src/models/service/service.ts` — MODIFY: add `deprecated_at`, `created_by`, `updated_by`.
- `src/repositories/service/service.repository.ts` — MODIFY: add admin CRUD + list methods.
- `src/repositories/worker/worker-service.repository.ts` — MODIFY: add reference-count + worker-id lookup.
- `src/repositories/booking/booking.repository.ts` — MODIFY: add reference count.
- `src/repositories/auth/user.repository.ts` — MODIFY: add active-worker-id lookup.
- `src/constants/notification.ts` — MODIFY: add 2 notification types.
- `src/services/notification/notification.service.ts` — MODIFY: add 2 config entries.
- `src/utils/i18n.ts` — MODIFY: add 4 notification copy keys.
- `src/services/service/admin-service.service.ts` — CREATE: lifecycle business logic.
- `src/services/service/admin-service.service.test.ts` — CREATE: unit tests.
- `src/validations/service/admin-service.validation.ts` — CREATE: Zod schemas.
- `src/validations/service/index.ts` — MODIFY: re-export admin schemas.
- `src/controllers/service/admin-service.controller.ts` — CREATE: HTTP handlers.
- `src/routes/service/admin-service.routes.ts` — CREATE: admin route group.
- `src/routes/index.ts` — MODIFY: mount `/admin/services`.

**Frontend (`pr1as-client/`):**
- `services/admin-service.service.ts` — CREATE: admin service API client + types.
- `services/service.service.ts` — MODIFY: add `deprecated_at` to `ServiceItem`.
- `lib/query-keys.ts` — MODIFY: add `services` admin keys.
- `lib/hooks/use-admin-services.ts` — CREATE: admin CRUD hooks.
- `components/dashboard/service-form-dialog.tsx` — CREATE: create/edit form dialog.
- `app/dashboard/services/page.tsx` — CREATE: admin management page.
- `components/worker/new-services-banner.tsx` — CREATE: opt-in banner.
- `app/worker/setup/page.tsx` — MODIFY: render the banner.

---

## Task 1: Service lifecycle fields + error codes + input types

**Files:**
- Modify: `SERVER/src/types/common/error.types.ts`
- Modify: `SERVER/src/types/service/service.type.ts`
- Modify: `SERVER/src/models/service/service.ts`

**Interfaces:**
- Produces:
  - `ErrorCode.SERVICE_CODE_EXISTS`, `ErrorCode.SERVICE_CODE_IMMUTABLE`, `ErrorCode.SERVICE_IN_USE`.
  - `IServiceDocument` gains `deprecated_at: Date | null`, `created_by: Types.ObjectId | null`, `updated_by: Types.ObjectId | null`.
  - `CreateServiceInput`, `UpdateServiceInput`, `AdminServiceFilter`, `LocalizedName`, `LocalizedDescription`, `ServiceRules` exported from `service.type.ts`.

- [ ] **Step 1: Add error codes**

In `SERVER/src/types/common/error.types.ts`, add these three members at the end of the `ErrorCode` enum (before the closing brace, after `POST_REGISTRATION_UNAUTHORIZED`):

```typescript
  SERVICE_CODE_EXISTS = "SERVICE_CODE_EXISTS",
  SERVICE_CODE_IMMUTABLE = "SERVICE_CODE_IMMUTABLE",
  SERVICE_IN_USE = "SERVICE_IN_USE",
```

- [ ] **Step 2: Extend `IServiceDocument` and add input types**

In `SERVER/src/types/service/service.type.ts`, change the import line and add fields + new types. Replace the file's `import` line and `IServiceDocument` interface with:

```typescript
import { Document, Types } from "mongoose";

export enum ServiceCategory {
  VIRTUAL = "VIRTUAL",
  PHYSICAL = "PHYSICAL",
}

export enum DressCode {
  CASUAL = "CASUAL",
  SEMI_FORMAL = "SEMI_FORMAL",
  FORMAL = "FORMAL",
}

export interface LocalizedName {
  en: string;
  vi: string;
  zh?: string | null;
  ko?: string | null;
}

export interface LocalizedDescription {
  en?: string;
  vi?: string;
  zh?: string | null;
  ko?: string | null;
}

export interface ServiceRules {
  physical_touch: boolean;
  intellectual_conversation_required: boolean;
  dress_code: DressCode;
}

export interface IServiceDocument extends Document {
  category: ServiceCategory;
  code: string;
  icon: string;
  name: LocalizedName;
  description: LocalizedDescription;
  companionship_level: number | null;
  rules: ServiceRules | null;
  is_active: boolean;
  deprecated_at: Date | null;
  created_by: Types.ObjectId | null;
  updated_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateServiceInput {
  code: string;
  category: ServiceCategory;
  icon: string;
  name: LocalizedName;
  description?: LocalizedDescription;
  companionship_level?: number | null;
  rules?: ServiceRules | null;
}

export interface UpdateServiceInput {
  category?: ServiceCategory;
  icon?: string;
  name?: LocalizedName;
  description?: LocalizedDescription;
  companionship_level?: number | null;
  rules?: ServiceRules | null;
}

export interface AdminServiceFilter {
  category?: ServiceCategory;
  is_active?: boolean;
}
```

- [ ] **Step 3: Add model fields**

In `SERVER/src/models/service/service.ts`, add these fields to `serviceSchema` immediately after the `is_active` block (after line ~59, before `created_at`):

```typescript
    deprecated_at: {
      type: Date,
      default: null,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
    },
```

- [ ] **Step 4: Verify the build compiles**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd SERVER && git add src/types/common/error.types.ts src/types/service/service.type.ts src/models/service/service.ts
git commit -m "feat(service): add lifecycle fields and admin input types"
```

---

## Task 2: Repository methods (service admin CRUD + reference counts + active workers)

**Files:**
- Modify: `SERVER/src/repositories/service/service.repository.ts`
- Modify: `SERVER/src/repositories/worker/worker-service.repository.ts`
- Modify: `SERVER/src/repositories/booking/booking.repository.ts`
- Modify: `SERVER/src/repositories/auth/user.repository.ts`

**Interfaces:**
- Consumes: `IServiceDocument`, `CreateServiceInput`, `UpdateServiceInput`, `AdminServiceFilter` (Task 1).
- Produces:
  - `serviceRepository.findAllAdmin(filter: AdminServiceFilter): Promise<IServiceDocument[]>`
  - `serviceRepository.create(data: CreateServiceInput & { created_by: string }): Promise<IServiceDocument>`
  - `serviceRepository.updateById(id: string, patch: UpdateServiceInput & { updated_by: string }): Promise<IServiceDocument | null>`
  - `serviceRepository.setActiveState(id: string, isActive: boolean, deprecatedAt: Date | null, updatedBy: string): Promise<IServiceDocument | null>`
  - `serviceRepository.deleteById(id: string): Promise<boolean>`
  - `workerServiceRepository.countByServiceId(serviceId: string): Promise<number>`
  - `workerServiceRepository.findWorkerIdsByServiceId(serviceId: string): Promise<string[]>`
  - `bookingRepository.countByServiceId(serviceId: string): Promise<number>`
  - `userRepository.findActiveWorkerIds(): Promise<string[]>`

These are thin Mongoose wrappers with no branching logic; they are exercised through the mocked service-layer tests in Tasks 4–6 (the client has no live-DB test harness). Verify via build.

- [ ] **Step 1: Add service admin methods**

In `SERVER/src/repositories/service/service.repository.ts`, update the import and add methods inside the `ServiceRepository` class (before the closing brace). Change the import block to:

```typescript
import { Service } from "../../models/service/service";
import {
  IServiceDocument,
  ServiceCategory,
  CreateServiceInput,
  UpdateServiceInput,
  AdminServiceFilter,
} from "../../types/service/service.type";
```

Add these methods to the class:

```typescript
  async findAllAdmin(filter: AdminServiceFilter): Promise<IServiceDocument[]> {
    const query: { category?: ServiceCategory; is_active?: boolean } = {};
    if (filter.category !== undefined) {
      query.category = filter.category;
    }
    if (filter.is_active !== undefined) {
      query.is_active = filter.is_active;
    }
    return Service.find(query).sort({ created_at: -1 });
  }

  async create(
    data: CreateServiceInput & { created_by: string }
  ): Promise<IServiceDocument> {
    return Service.create({ ...data, is_active: true, deprecated_at: null });
  }

  async updateById(
    id: string,
    patch: UpdateServiceInput & { updated_by: string }
  ): Promise<IServiceDocument | null> {
    return Service.findByIdAndUpdate(
      id,
      { $set: { ...patch, updated_at: new Date() } },
      { new: true, runValidators: true }
    );
  }

  async setActiveState(
    id: string,
    isActive: boolean,
    deprecatedAt: Date | null,
    updatedBy: string
  ): Promise<IServiceDocument | null> {
    return Service.findByIdAndUpdate(
      id,
      {
        $set: {
          is_active: isActive,
          deprecated_at: deprecatedAt,
          updated_by: updatedBy,
          updated_at: new Date(),
        },
      },
      { new: true }
    );
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await Service.findByIdAndDelete(id);
    return result !== null;
  }
```

- [ ] **Step 2: Add worker-service reference methods**

In `SERVER/src/repositories/worker/worker-service.repository.ts`, add these methods inside the `WorkerServiceRepository` class (before its closing brace):

```typescript
  async countByServiceId(serviceId: string): Promise<number> {
    return WorkerService.countDocuments({ service_id: serviceId });
  }

  async findWorkerIdsByServiceId(serviceId: string): Promise<string[]> {
    const ids = await WorkerService.distinct("worker_id", {
      service_id: serviceId,
    });
    return ids.map((id) => id.toString());
  }
```

- [ ] **Step 3: Add booking reference count**

In `SERVER/src/repositories/booking/booking.repository.ts`, add this method inside the `BookingRepository` class (before its closing brace):

```typescript
  async countByServiceId(serviceId: string): Promise<number> {
    return Booking.countDocuments({ service_id: serviceId });
  }
```

- [ ] **Step 4: Add active-worker-id lookup**

In `SERVER/src/repositories/auth/user.repository.ts`, add this method inside the `UserRepository` class (before its closing brace). It uses `UserRole`/`UserStatus` already imported in that file:

```typescript
  async findActiveWorkerIds(): Promise<string[]> {
    const users = await User.find({
      roles: UserRole.WORKER,
      status: UserStatus.ACTIVE,
    })
      .select("_id")
      .lean();
    return users.map((user) => user._id.toString());
  }
```

If `UserRole`/`UserStatus` are not already imported in this file, add them:

```typescript
import { UserRole, UserStatus } from "../../types/auth/user.types";
```

- [ ] **Step 5: Verify the build compiles**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd SERVER && git add src/repositories/service/service.repository.ts src/repositories/worker/worker-service.repository.ts src/repositories/booking/booking.repository.ts src/repositories/auth/user.repository.ts
git commit -m "feat(service): add admin repository methods and reference counts"
```

---

## Task 3: Notification types, config, and localized copy

**Files:**
- Modify: `SERVER/src/constants/notification.ts`
- Modify: `SERVER/src/services/notification/notification.service.ts`
- Modify: `SERVER/src/utils/i18n.ts`

**Interfaces:**
- Produces: `NotificationType.SERVICE_DEPRECATED`, `NotificationType.SERVICE_ADDED`; i18n keys `notif.service.added.title`, `notif.service.added.body`, `notif.service.deprecated.title`, `notif.service.deprecated.body`.

- [ ] **Step 1: Add notification types**

In `SERVER/src/constants/notification.ts`, add to the `NotificationType` enum (after `WORKER_QUESTION_ANSWERED`, before the closing brace):

```typescript
  SERVICE_DEPRECATED = "service.deprecated",
  SERVICE_ADDED = "service.added",
```

- [ ] **Step 2: Add type config entries**

In `SERVER/src/services/notification/notification.service.ts`, add these entries to `NOTIFICATION_TYPE_CONFIG` (after the `MODERATION_RESTRICTION_APPLIED` entry, before the closing `}`):

```typescript
  [NotificationType.SERVICE_DEPRECATED]: {
    category: NotificationCategory.SYSTEM,
    priority: NotificationPriority.NORMAL,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  },
  [NotificationType.SERVICE_ADDED]: {
    category: NotificationCategory.SYSTEM,
    priority: NotificationPriority.NORMAL,
    channels: [NotificationChannel.IN_APP],
  },
```

Confirm `NotificationCategory`, `NotificationPriority`, and `NotificationChannel` are already imported at the top of this file (they are, used by existing entries).

- [ ] **Step 3: Add localized notification copy**

In `SERVER/src/utils/i18n.ts`, add these four keys to the `translations` object (anywhere among the `notif.*` keys, e.g. after `notif.booking.created.body`):

```typescript
  "notif.service.added.title": {
    en: "New service available",
    vi: "Có dịch vụ mới",
    ko: "새로운 서비스 이용 가능",
    zh: "有新服务",
  },
  "notif.service.added.body": {
    en: "A new service was added. Add it to your profile to receive bookings.",
    vi: "Một dịch vụ mới vừa được thêm. Thêm vào hồ sơ của bạn để nhận đặt lịch.",
    ko: "새 서비스가 추가되었습니다. 예약을 받으려면 프로필에 추가하세요.",
    zh: "已新增一项服务。将其添加到您的资料中以接收预订。",
  },
  "notif.service.deprecated.title": {
    en: "A service was discontinued",
    vi: "Một dịch vụ đã ngừng",
    ko: "서비스가 중단되었습니다",
    zh: "一项服务已停用",
  },
  "notif.service.deprecated.body": {
    en: "A service you offer no longer accepts new bookings. Existing bookings are unaffected.",
    vi: "Một dịch vụ bạn cung cấp không còn nhận đặt lịch mới. Các đặt lịch hiện tại không bị ảnh hưởng.",
    ko: "제공 중인 서비스가 더 이상 새 예약을 받지 않습니다. 기존 예약은 영향을 받지 않습니다.",
    zh: "您提供的某项服务不再接受新预订。现有预订不受影响。",
  },
```

- [ ] **Step 4: Verify the build compiles**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd SERVER && git add src/constants/notification.ts src/services/notification/notification.service.ts src/utils/i18n.ts
git commit -m "feat(notification): add service lifecycle notification types and copy"
```

---

## Task 4: AdminServiceService — create + notify new service (TDD)

**Files:**
- Create: `SERVER/src/services/service/admin-service.service.ts`
- Create: `SERVER/src/services/service/admin-service.service.test.ts`

**Interfaces:**
- Consumes: repositories + `notificationService` (Tasks 2–3), `CreateServiceInput` (Task 1), `NotificationType.SERVICE_ADDED`, `NotificationChannel.IN_APP`.
- Produces: `adminServiceService.createService(input: CreateServiceInput, adminId: string): Promise<IServiceDocument>` and `adminServiceService.listServices(filter: AdminServiceFilter): Promise<IServiceDocument[]>`.

- [ ] **Step 1: Write the failing test**

Create `SERVER/src/services/service/admin-service.service.test.ts`:

```typescript
jest.mock("../../repositories/service/service.repository", () => ({
  serviceRepository: {
    findByCode: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    updateById: jest.fn(),
    setActiveState: jest.fn(),
    deleteById: jest.fn(),
    findAllAdmin: jest.fn(),
  },
}));
jest.mock("../../repositories/worker/worker-service.repository", () => ({
  workerServiceRepository: {
    countByServiceId: jest.fn(),
    findWorkerIdsByServiceId: jest.fn(),
  },
}));
jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: { countByServiceId: jest.fn() },
}));
jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: { findActiveWorkerIds: jest.fn() },
}));
jest.mock("../notification/notification.service", () => ({
  notificationService: { notify: jest.fn() },
}));

import { adminServiceService } from "./admin-service.service";
import { serviceRepository } from "../../repositories/service/service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { notificationService } from "../notification/notification.service";
import {
  NotificationType,
  NotificationChannel,
} from "../../constants/notification";
import { ServiceCategory, CreateServiceInput } from "../../types/service/service.type";

const baseInput: CreateServiceInput = {
  code: "NEWCODE",
  category: ServiceCategory.VIRTUAL,
  icon: "Star",
  name: { en: "New", vi: "Mới" },
};

describe("adminServiceService.createService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects a duplicate code with a 409", async () => {
    (serviceRepository.findByCode as jest.Mock).mockResolvedValue({ id: "x" });

    await expect(
      adminServiceService.createService(baseInput, "admin1")
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(serviceRepository.create).not.toHaveBeenCalled();
  });

  it("creates with created_by and notifies active workers in-app only", async () => {
    (serviceRepository.findByCode as jest.Mock).mockResolvedValue(null);
    (serviceRepository.create as jest.Mock).mockResolvedValue({
      _id: "svc1",
      code: "NEWCODE",
      name: { vi: "Mới" },
    });
    (userRepository.findActiveWorkerIds as jest.Mock).mockResolvedValue([
      "w1",
      "w2",
    ]);

    await adminServiceService.createService(baseInput, "admin1");

    expect(serviceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: "NEWCODE", created_by: "admin1" })
    );
    expect(notificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_ids: ["w1", "w2"],
        type: NotificationType.SERVICE_ADDED,
        channels: [NotificationChannel.IN_APP],
        dedupe_key: "service_added:svc1",
      })
    );
  });

  it("skips notify when there are no active workers", async () => {
    (serviceRepository.findByCode as jest.Mock).mockResolvedValue(null);
    (serviceRepository.create as jest.Mock).mockResolvedValue({
      _id: "svc1",
      code: "NEWCODE",
      name: { vi: "Mới" },
    });
    (userRepository.findActiveWorkerIds as jest.Mock).mockResolvedValue([]);

    await adminServiceService.createService(baseInput, "admin1");

    expect(notificationService.notify).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest src/services/service/admin-service.service.test.ts`
Expected: FAIL — cannot find module `./admin-service.service`.

- [ ] **Step 3: Write the minimal implementation**

Create `SERVER/src/services/service/admin-service.service.ts`:

```typescript
import { serviceRepository } from "../../repositories/service/service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { notificationService } from "../notification/notification.service";
import {
  IServiceDocument,
  CreateServiceInput,
  AdminServiceFilter,
} from "../../types/service/service.type";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import {
  NotificationType,
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
} from "../../constants/notification";
import { t } from "../../utils/i18n";

const WORKER_SETUP_LINK = "/worker/setup";

export class AdminServiceService {
  async listServices(
    filter: AdminServiceFilter
  ): Promise<IServiceDocument[]> {
    return serviceRepository.findAllAdmin(filter);
  }

  async createService(
    input: CreateServiceInput,
    adminId: string
  ): Promise<IServiceDocument> {
    const existing = await serviceRepository.findByCode(input.code);
    if (existing) {
      throw AppError.conflict(
        "Service code already exists",
        ErrorCode.SERVICE_CODE_EXISTS
      );
    }

    const service = await serviceRepository.create({
      ...input,
      created_by: adminId,
    });

    await this.notifyNewService(service);
    return service;
  }

  private async notifyNewService(service: IServiceDocument): Promise<void> {
    const workerIds = await userRepository.findActiveWorkerIds();
    if (workerIds.length === 0) {
      return;
    }

    const serviceId = String(service._id);
    await notificationService.notify({
      recipient_ids: workerIds,
      type: NotificationType.SERVICE_ADDED,
      category: NotificationCategory.SYSTEM,
      title: t("notif.service.added.title", "vi"),
      body: t("notif.service.added.body", "vi"),
      data: {
        service_id: serviceId,
        service_code: service.code,
        service_name: service.name.vi,
      },
      link: WORKER_SETUP_LINK,
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP],
      dedupe_key: `service_added:${serviceId}`,
    });
  }
}

export const adminServiceService = new AdminServiceService();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd SERVER && npx jest src/services/service/admin-service.service.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd SERVER && git add src/services/service/admin-service.service.ts src/services/service/admin-service.service.test.ts
git commit -m "feat(service): add admin create service with new-service notification"
```

---

## Task 5: AdminServiceService — update (code immutable) + deprecate + reactivate (TDD)

**Files:**
- Modify: `SERVER/src/services/service/admin-service.service.ts`
- Modify: `SERVER/src/services/service/admin-service.service.test.ts`

**Interfaces:**
- Consumes: `serviceRepository.setActiveState`/`updateById`/`findById`, `workerServiceRepository.findWorkerIdsByServiceId`, `NotificationType.SERVICE_DEPRECATED`, `NotificationChannel.EMAIL`.
- Produces:
  - `adminServiceService.updateService(id: string, input: UpdateServiceInput & { code?: string }, adminId: string): Promise<IServiceDocument>`
  - `adminServiceService.deprecateService(id: string, adminId: string): Promise<IServiceDocument>`
  - `adminServiceService.reactivateService(id: string, adminId: string): Promise<IServiceDocument>`

- [ ] **Step 1: Write the failing tests**

Append to `SERVER/src/services/service/admin-service.service.test.ts` (add `workerServiceRepository` to the imports from the worker repo, and add these describe blocks at the end of the file):

```typescript
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import { UpdateServiceInput } from "../../types/service/service.type";

describe("adminServiceService.updateService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects an attempt to change the code", async () => {
    await expect(
      adminServiceService.updateService(
        "svc1",
        { code: "OTHER" } as UpdateServiceInput & { code?: string },
        "admin1"
      )
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(serviceRepository.updateById).not.toHaveBeenCalled();
  });

  it("updates allowed fields and stamps updated_by", async () => {
    (serviceRepository.updateById as jest.Mock).mockResolvedValue({
      _id: "svc1",
      icon: "Music",
    });

    await adminServiceService.updateService(
      "svc1",
      { icon: "Music" },
      "admin1"
    );

    expect(serviceRepository.updateById).toHaveBeenCalledWith("svc1", {
      icon: "Music",
      updated_by: "admin1",
    });
  });

  it("throws 404 when the service does not exist", async () => {
    (serviceRepository.updateById as jest.Mock).mockResolvedValue(null);

    await expect(
      adminServiceService.updateService("missing", { icon: "X" }, "admin1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("adminServiceService.deprecateService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("deactivates, stamps deprecated_at, and notifies offering workers via in-app + email", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({
      _id: "svc1",
      is_active: true,
    });
    (serviceRepository.setActiveState as jest.Mock).mockResolvedValue({
      _id: "svc1",
      code: "CODE1",
      name: { vi: "Dịch vụ" },
      is_active: false,
    });
    (
      workerServiceRepository.findWorkerIdsByServiceId as jest.Mock
    ).mockResolvedValue(["w1", "w2"]);

    await adminServiceService.deprecateService("svc1", "admin1");

    expect(serviceRepository.setActiveState).toHaveBeenCalledWith(
      "svc1",
      false,
      expect.any(Date),
      "admin1"
    );
    expect(notificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_ids: ["w1", "w2"],
        type: NotificationType.SERVICE_DEPRECATED,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        dedupe_key: "service_deprecated:svc1",
      })
    );
  });

  it("is idempotent when already deprecated (no write, no notify)", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({
      _id: "svc1",
      is_active: false,
    });

    await adminServiceService.deprecateService("svc1", "admin1");

    expect(serviceRepository.setActiveState).not.toHaveBeenCalled();
    expect(notificationService.notify).not.toHaveBeenCalled();
  });

  it("throws 404 when the service does not exist", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      adminServiceService.deprecateService("missing", "admin1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("adminServiceService.reactivateService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reactivates and clears deprecated_at", async () => {
    (serviceRepository.setActiveState as jest.Mock).mockResolvedValue({
      _id: "svc1",
      is_active: true,
    });

    await adminServiceService.reactivateService("svc1", "admin1");

    expect(serviceRepository.setActiveState).toHaveBeenCalledWith(
      "svc1",
      true,
      null,
      "admin1"
    );
  });

  it("throws 404 when the service does not exist", async () => {
    (serviceRepository.setActiveState as jest.Mock).mockResolvedValue(null);

    await expect(
      adminServiceService.reactivateService("missing", "admin1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd SERVER && npx jest src/services/service/admin-service.service.test.ts`
Expected: FAIL — `updateService`/`deprecateService`/`reactivateService` are not functions.

- [ ] **Step 3: Implement the methods**

In `SERVER/src/services/service/admin-service.service.ts`, update the imports and add the three methods. Extend the type imports:

```typescript
import {
  IServiceDocument,
  CreateServiceInput,
  UpdateServiceInput,
  AdminServiceFilter,
} from "../../types/service/service.type";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
```

Add these methods to the `AdminServiceService` class (after `createService`, before `notifyNewService`):

```typescript
  async updateService(
    id: string,
    input: UpdateServiceInput & { code?: string },
    adminId: string
  ): Promise<IServiceDocument> {
    if (input.code !== undefined) {
      throw AppError.badRequest("Service code cannot be changed");
    }

    const updated = await serviceRepository.updateById(id, {
      ...input,
      updated_by: adminId,
    });
    if (!updated) {
      throw AppError.notFound("Service not found");
    }
    return updated;
  }

  async deprecateService(
    id: string,
    adminId: string
  ): Promise<IServiceDocument> {
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw AppError.notFound("Service not found");
    }
    if (!service.is_active) {
      return service;
    }

    const updated = await serviceRepository.setActiveState(
      id,
      false,
      new Date(),
      adminId
    );
    if (!updated) {
      throw AppError.notFound("Service not found");
    }

    await this.notifyDeprecatedService(updated);
    return updated;
  }

  async reactivateService(
    id: string,
    adminId: string
  ): Promise<IServiceDocument> {
    const updated = await serviceRepository.setActiveState(
      id,
      true,
      null,
      adminId
    );
    if (!updated) {
      throw AppError.notFound("Service not found");
    }
    return updated;
  }

  private async notifyDeprecatedService(
    service: IServiceDocument
  ): Promise<void> {
    const serviceId = String(service._id);
    const workerIds =
      await workerServiceRepository.findWorkerIdsByServiceId(serviceId);
    if (workerIds.length === 0) {
      return;
    }

    await notificationService.notify({
      recipient_ids: workerIds,
      type: NotificationType.SERVICE_DEPRECATED,
      category: NotificationCategory.SYSTEM,
      title: t("notif.service.deprecated.title", "vi"),
      body: t("notif.service.deprecated.body", "vi"),
      data: {
        service_id: serviceId,
        service_code: service.code,
        service_name: service.name.vi,
      },
      link: WORKER_SETUP_LINK,
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      dedupe_key: `service_deprecated:${serviceId}`,
    });
  }
```

Note: `updateService` accepts the `code` field only so it can reject it; the `input.code` check runs before `updateById`, and `UpdateServiceInput` itself has no `code`, so no code value reaches the repository.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd SERVER && npx jest src/services/service/admin-service.service.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
cd SERVER && git add src/services/service/admin-service.service.ts src/services/service/admin-service.service.test.ts
git commit -m "feat(service): add update, deprecate, and reactivate with notifications"
```

---

## Task 6: AdminServiceService — delete guardrail (TDD)

**Files:**
- Modify: `SERVER/src/services/service/admin-service.service.ts`
- Modify: `SERVER/src/services/service/admin-service.service.test.ts`

**Interfaces:**
- Consumes: `workerServiceRepository.countByServiceId`, `bookingRepository.countByServiceId`, `serviceRepository.deleteById`, `HTTP_STATUS`, `ErrorCode.SERVICE_IN_USE`.
- Produces: `adminServiceService.deleteService(id: string): Promise<void>` — throws `409` with `details` `[{field:"worker_count",...},{field:"booking_count",...}]` when referenced.

- [ ] **Step 1: Write the failing tests**

Append to `SERVER/src/services/service/admin-service.service.test.ts` (add the booking-repo import at the top import area and this describe block at the end):

```typescript
import { bookingRepository } from "../../repositories/booking/booking.repository";

describe("adminServiceService.deleteService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("throws 404 when the service does not exist", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      adminServiceService.deleteService("missing")
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("blocks deletion with 409 when workers still reference it", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ _id: "svc1" });
    (workerServiceRepository.countByServiceId as jest.Mock).mockResolvedValue(3);
    (bookingRepository.countByServiceId as jest.Mock).mockResolvedValue(0);

    await expect(
      adminServiceService.deleteService("svc1")
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "SERVICE_IN_USE",
      details: [
        { field: "worker_count", message: "3" },
        { field: "booking_count", message: "0" },
      ],
    });
    expect(serviceRepository.deleteById).not.toHaveBeenCalled();
  });

  it("blocks deletion with 409 when bookings still reference it", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ _id: "svc1" });
    (workerServiceRepository.countByServiceId as jest.Mock).mockResolvedValue(0);
    (bookingRepository.countByServiceId as jest.Mock).mockResolvedValue(5);

    await expect(
      adminServiceService.deleteService("svc1")
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(serviceRepository.deleteById).not.toHaveBeenCalled();
  });

  it("deletes when there are zero references", async () => {
    (serviceRepository.findById as jest.Mock).mockResolvedValue({ _id: "svc1" });
    (workerServiceRepository.countByServiceId as jest.Mock).mockResolvedValue(0);
    (bookingRepository.countByServiceId as jest.Mock).mockResolvedValue(0);
    (serviceRepository.deleteById as jest.Mock).mockResolvedValue(true);

    await adminServiceService.deleteService("svc1");

    expect(serviceRepository.deleteById).toHaveBeenCalledWith("svc1");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd SERVER && npx jest src/services/service/admin-service.service.test.ts`
Expected: FAIL — `deleteService` is not a function.

- [ ] **Step 3: Implement the guardrail**

In `SERVER/src/services/service/admin-service.service.ts`, add imports and the method. Extend imports:

```typescript
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { HTTP_STATUS } from "../../constants/httpStatus";
```

Add this method to the class (after `reactivateService`, before `notifyNewService`):

```typescript
  async deleteService(id: string): Promise<void> {
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw AppError.notFound("Service not found");
    }

    const [workerCount, bookingCount] = await Promise.all([
      workerServiceRepository.countByServiceId(id),
      bookingRepository.countByServiceId(id),
    ]);

    if (workerCount > 0 || bookingCount > 0) {
      throw new AppError(
        "Service is in use; deprecate it instead of deleting",
        HTTP_STATUS.CONFLICT,
        ErrorCode.SERVICE_IN_USE,
        [
          { field: "worker_count", message: String(workerCount) },
          { field: "booking_count", message: String(bookingCount) },
        ]
      );
    }

    await serviceRepository.deleteById(id);
  }
```

- [ ] **Step 4: Run the full service test suite**

Run: `cd SERVER && npx jest src/services/service/admin-service.service.test.ts`
Expected: PASS (all describe blocks, including delete guardrail).

- [ ] **Step 5: Commit**

```bash
cd SERVER && git add src/services/service/admin-service.service.ts src/services/service/admin-service.service.test.ts
git commit -m "feat(service): add guarded hard-delete for services"
```

---

## Task 7: Admin validation schemas (Zod)

**Files:**
- Create: `SERVER/src/validations/service/admin-service.validation.ts`
- Modify: `SERVER/src/validations/service/index.ts`

**Interfaces:**
- Consumes: `ServiceCategory`, `DressCode` (Task 1).
- Produces: `createServiceSchema`, `updateServiceSchema`, `adminServiceQuerySchema` — parsed types structurally match `CreateServiceInput` / `UpdateServiceInput` / `AdminServiceFilter`.

- [ ] **Step 1: Write the schemas**

Create `SERVER/src/validations/service/admin-service.validation.ts`:

```typescript
import { z } from "zod";
import { ServiceCategory, DressCode } from "../../types/service/service.type";

const localizedName = z.object({
  en: z.string().min(1, "English name is required"),
  vi: z.string().min(1, "Vietnamese name is required"),
  zh: z.string().nullable().optional(),
  ko: z.string().nullable().optional(),
});

const localizedDescription = z.object({
  en: z.string().optional(),
  vi: z.string().optional(),
  zh: z.string().nullable().optional(),
  ko: z.string().nullable().optional(),
});

const serviceRules = z.object({
  physical_touch: z.boolean(),
  intellectual_conversation_required: z.boolean(),
  dress_code: z.nativeEnum(DressCode),
});

export const createServiceSchema = z.object({
  code: z
    .string()
    .min(2)
    .regex(/^[A-Z0-9_]+$/, "Code must be uppercase letters, digits, or underscore"),
  category: z.nativeEnum(ServiceCategory),
  icon: z.string().min(1),
  name: localizedName,
  description: localizedDescription.optional(),
  companionship_level: z.number().int().min(1).max(3).nullable().optional(),
  rules: serviceRules.nullable().optional(),
});

export const updateServiceSchema = z.object({
  category: z.nativeEnum(ServiceCategory).optional(),
  icon: z.string().min(1).optional(),
  name: localizedName.optional(),
  description: localizedDescription.optional(),
  companionship_level: z.number().int().min(1).max(3).nullable().optional(),
  rules: serviceRules.nullable().optional(),
});

export const adminServiceQuerySchema = z.object({
  category: z.nativeEnum(ServiceCategory).optional(),
  is_active: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return undefined;
      return val === "true";
    }),
});

export type CreateServiceSchemaType = z.infer<typeof createServiceSchema>;
export type UpdateServiceSchemaType = z.infer<typeof updateServiceSchema>;
export type AdminServiceQueryType = z.infer<typeof adminServiceQuerySchema>;
```

Note: `updateServiceSchema` deliberately omits `code`, so a `code` field in the body is stripped by Zod. The service layer's `input.code` guard (Task 5) additionally rejects a `code` that reaches it defensively.

- [ ] **Step 2: Re-export from the index barrel**

In `SERVER/src/validations/service/index.ts`, add after the existing `export * from "./service.validation";`:

```typescript
export * from "./admin-service.validation";
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd SERVER && git add src/validations/service/admin-service.validation.ts src/validations/service/index.ts
git commit -m "feat(service): add admin service validation schemas"
```

---

## Task 8: Admin controller + routes + mount

**Files:**
- Create: `SERVER/src/controllers/service/admin-service.controller.ts`
- Create: `SERVER/src/routes/service/admin-service.routes.ts`
- Modify: `SERVER/src/routes/index.ts`

**Interfaces:**
- Consumes: `adminServiceService` (Tasks 4–6), Zod schemas (Task 7), `R`, `validateWithSchema`, `extractUserIdFromRequest`, middleware.
- Produces: mounted route group `POST/GET/PATCH/DELETE /api/admin/services` + `/deprecate` + `/reactivate`.

- [ ] **Step 1: Write the controller**

Create `SERVER/src/controllers/service/admin-service.controller.ts`:

```typescript
import { Request, Response } from "express";
import { adminServiceService } from "../../services/service/admin-service.service";
import {
  createServiceSchema,
  updateServiceSchema,
  adminServiceQuerySchema,
} from "../../validations/service/admin-service.validation";
import { COMMON_MESSAGES } from "../../constants/messages";
import { R, validateWithSchema } from "../../utils";
import { extractUserIdFromRequest } from "../../utils";

export class AdminServiceController {
  async list(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(
      adminServiceQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const services = await adminServiceService.listServices(query);
    R.success(res, { services, count: services.length });
  }

  async create(req: Request, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const input = validateWithSchema(
      createServiceSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const service = await adminServiceService.createService(input, adminId);
    R.created(res, { service });
  }

  async update(req: Request, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const input = validateWithSchema(
      updateServiceSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const service = await adminServiceService.updateService(
      req.params.id,
      input,
      adminId
    );
    R.success(res, { service });
  }

  async deprecate(req: Request, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const service = await adminServiceService.deprecateService(
      req.params.id,
      adminId
    );
    R.success(res, { service });
  }

  async reactivate(req: Request, res: Response): Promise<void> {
    const adminId = extractUserIdFromRequest(req);
    const service = await adminServiceService.reactivateService(
      req.params.id,
      adminId
    );
    R.success(res, { service });
  }

  async remove(req: Request, res: Response): Promise<void> {
    await adminServiceService.deleteService(req.params.id);
    R.success(res, { deleted: true });
  }
}

export const adminServiceController = new AdminServiceController();
```

Note: confirm `extractUserIdFromRequest` is exported from `utils` (it is — see `src/utils/index.ts`). If it returns `string | undefined`, and the routes are `adminOnly` (always authenticated), it will be a string; if the type is `string | undefined`, coerce with `String(extractUserIdFromRequest(req))` or add a guard `if (!adminId) throw AppError.unauthorized()`.

- [ ] **Step 2: Write the routes**

Create `SERVER/src/routes/service/admin-service.routes.ts`:

```typescript
import { Router } from "express";
import { authenticate, adminOnly } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { validateObjectId } from "../../middleware";
import { asyncHandler } from "../../utils";
import { adminServiceController } from "../../controllers/service/admin-service.controller";

const router = Router();

router.use(authenticate, adminOnly);

router.get(
  "/",
  asyncHandler(adminServiceController.list.bind(adminServiceController))
);

router.post(
  "/",
  ...csrfProtection,
  asyncHandler(adminServiceController.create.bind(adminServiceController))
);

router.patch(
  "/:id",
  validateObjectId("id"),
  ...csrfProtection,
  asyncHandler(adminServiceController.update.bind(adminServiceController))
);

router.post(
  "/:id/deprecate",
  validateObjectId("id"),
  ...csrfProtection,
  asyncHandler(adminServiceController.deprecate.bind(adminServiceController))
);

router.post(
  "/:id/reactivate",
  validateObjectId("id"),
  ...csrfProtection,
  asyncHandler(adminServiceController.reactivate.bind(adminServiceController))
);

router.delete(
  "/:id",
  validateObjectId("id"),
  ...csrfProtection,
  asyncHandler(adminServiceController.remove.bind(adminServiceController))
);

export default router;
```

- [ ] **Step 3: Mount the route group**

In `SERVER/src/routes/index.ts`, add the import near the other route imports:

```typescript
import adminServiceRoutes from "./service/admin-service.routes";
```

And mount it alongside the other `/admin/*` mounts (e.g. after `router.use("/admin/boost", boostAdminRoutes);`):

```typescript
router.use("/admin/services", adminServiceRoutes);
```

- [ ] **Step 4: Verify the build compiles**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually smoke-test the endpoint**

Run the dev server and hit the list endpoint as an admin (replace `<TOKEN>`):

```bash
cd SERVER && npm run dev
# in another shell:
curl -s http://localhost:3000/api/admin/services -H "Authorization: Bearer <TOKEN>" | head
```

Expected: JSON `{ "success": true, "data": { "services": [...], "count": N } }` (or `401` without a valid admin token, confirming the guard).

- [ ] **Step 6: Commit**

```bash
cd SERVER && git add src/controllers/service/admin-service.controller.ts src/routes/service/admin-service.routes.ts src/routes/index.ts
git commit -m "feat(service): expose admin service management endpoints"
```

---

## Task 9: Frontend — admin service API client + types

**Files:**
- Create: `pr1as-client/services/admin-service.service.ts`
- Modify: `pr1as-client/services/service.service.ts`

**Interfaces:**
- Consumes: `api` (`lib/axios`), `ServiceItem` shape.
- Produces: `adminServiceApi` with `list`, `create`, `update`, `deprecate`, `reactivate`, `remove`; types `AdminServiceItem`, `CreateServicePayload`, `UpdateServicePayload`.

- [ ] **Step 1: Add `deprecated_at` to the shared `ServiceItem`**

In `pr1as-client/services/service.service.ts`, add to the `ServiceItem` type (after `is_active: boolean`):

```typescript
  deprecated_at: string | null
```

- [ ] **Step 2: Write the admin client**

Create `pr1as-client/services/admin-service.service.ts`:

```typescript
import { api } from "@/lib/axios"
import type { LocalizedText } from "@/lib/locale"
import type { ServiceItem } from "@/services/service.service"

type ApiResponse<T> = {
  success: boolean
  message?: string
  data?: T
}

export type AdminServiceItem = ServiceItem

export type ServiceRulesPayload = {
  physical_touch: boolean
  intellectual_conversation_required: boolean
  dress_code: string
}

export type CreateServicePayload = {
  code: string
  category: string
  icon: string
  name: LocalizedText
  description?: LocalizedText
  companionship_level?: number | null
  rules?: ServiceRulesPayload | null
}

export type UpdateServicePayload = Omit<CreateServicePayload, "code">

type ServicesListResponse = {
  services: AdminServiceItem[]
  count: number
}

type ServiceResponse = {
  service: AdminServiceItem
}

const list = async (params?: {
  category?: string
  is_active?: boolean
}): Promise<AdminServiceItem[]> => {
  const response = await api.get<ApiResponse<ServicesListResponse>>(
    "/admin/services",
    { params }
  )
  return response.data.data?.services ?? []
}

const create = async (
  payload: CreateServicePayload
): Promise<AdminServiceItem | null> => {
  const response = await api.post<ApiResponse<ServiceResponse>>(
    "/admin/services",
    payload
  )
  return response.data.data?.service ?? null
}

const update = async (
  id: string,
  payload: UpdateServicePayload
): Promise<AdminServiceItem | null> => {
  const response = await api.patch<ApiResponse<ServiceResponse>>(
    `/admin/services/${id}`,
    payload
  )
  return response.data.data?.service ?? null
}

const deprecate = async (id: string): Promise<AdminServiceItem | null> => {
  const response = await api.post<ApiResponse<ServiceResponse>>(
    `/admin/services/${id}/deprecate`
  )
  return response.data.data?.service ?? null
}

const reactivate = async (id: string): Promise<AdminServiceItem | null> => {
  const response = await api.post<ApiResponse<ServiceResponse>>(
    `/admin/services/${id}/reactivate`
  )
  return response.data.data?.service ?? null
}

const remove = async (id: string): Promise<void> => {
  await api.delete(`/admin/services/${id}`)
}

export const adminServiceApi = {
  list,
  create,
  update,
  deprecate,
  reactivate,
  remove,
}
```

- [ ] **Step 3: Verify types compile**

Run: `cd pr1as-client && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd pr1as-client && git add services/admin-service.service.ts services/service.service.ts
git commit -m "feat(service): add admin service API client"
```

---

## Task 10: Frontend — query keys + admin hooks

**Files:**
- Modify: `pr1as-client/lib/query-keys.ts`
- Create: `pr1as-client/lib/hooks/use-admin-services.ts`

**Interfaces:**
- Consumes: `adminServiceApi` (Task 9), `queryKeys`.
- Produces: `useAdminServices(params?)`, `useCreateService()`, `useUpdateService()`, `useDeprecateService()`, `useReactivateService()`, `useDeleteService()`.

- [ ] **Step 1: Add query keys**

In `pr1as-client/lib/query-keys.ts`, add a `services` group inside the exported `queryKeys` object (place it near the `workers` group):

```typescript
  services: {
    all: ["services"] as const,
    adminList: (params?: Record<string, unknown>) =>
      ["services", "admin", "list", params] as const,
  },
```

- [ ] **Step 2: Write the hooks**

Create `pr1as-client/lib/hooks/use-admin-services.ts`:

```typescript
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { getErrorMessage } from "@/lib/utils/error-handler"
import {
  adminServiceApi,
  type CreateServicePayload,
  type UpdateServicePayload,
} from "@/services/admin-service.service"

export const useAdminServices = (params?: {
  category?: string
  is_active?: boolean
}) => {
  return useQuery({
    queryKey: queryKeys.services.adminList(params),
    queryFn: () => adminServiceApi.list(params),
  })
}

export const useCreateService = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateServicePayload) =>
      adminServiceApi.create(payload),
    onSuccess: () => {
      toast.success("Đã tạo dịch vụ.")
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể tạo dịch vụ.")),
  })
}

export const useUpdateService = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateServicePayload
    }) => adminServiceApi.update(id, payload),
    onSuccess: () => {
      toast.success("Đã cập nhật dịch vụ.")
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể cập nhật dịch vụ.")),
  })
}

export const useDeprecateService = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminServiceApi.deprecate(id),
    onSuccess: () => {
      toast.success("Đã ngừng dịch vụ.")
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể ngừng dịch vụ.")),
  })
}

export const useReactivateService = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminServiceApi.reactivate(id),
    onSuccess: () => {
      toast.success("Đã bật lại dịch vụ.")
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể bật lại dịch vụ.")),
  })
}

export const useDeleteService = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminServiceApi.remove(id),
    onSuccess: () => {
      toast.success("Đã xóa dịch vụ.")
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          "Không thể xóa dịch vụ. Nếu đang được sử dụng, hãy Ngừng thay vì Xóa."
        )
      ),
  })
}
```

Note: `getErrorMessage` reads the API error message; the backend 409 `SERVICE_IN_USE` message and its `details` (worker/booking counts) are surfaced via the toast fallback text. Verify `lib/utils/error-handler` exports `getErrorMessage` (it is used by `use-announcements.ts`).

- [ ] **Step 3: Verify types compile**

Run: `cd pr1as-client && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd pr1as-client && git add lib/query-keys.ts lib/hooks/use-admin-services.ts
git commit -m "feat(service): add admin service query keys and hooks"
```

---

## Task 11: Frontend — service create/edit form dialog

**Files:**
- Create: `pr1as-client/components/dashboard/service-form-dialog.tsx`

**Interfaces:**
- Consumes: `useCreateService`, `useUpdateService` (Task 10); shadcn/ui primitives.
- Produces: `ServiceFormDialog` — a controlled dialog for both create and edit modes.
  Props: `{ open: boolean; onOpenChange: (open: boolean) => void; service?: AdminServiceItem | null }`. When `service` is provided it edits; otherwise it creates.

- [ ] **Step 1: Build the form dialog**

Create `pr1as-client/components/dashboard/service-form-dialog.tsx`. Adjust `@/components/ui/*` import paths only if a primitive lives elsewhere in this repo (search `components/ui`).

```typescript
"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useCreateService,
  useUpdateService,
} from "@/lib/hooks/use-admin-services"
import type { AdminServiceItem } from "@/services/admin-service.service"

type ServiceFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: AdminServiceItem | null
}

type FormState = {
  code: string
  category: string
  icon: string
  nameVi: string
  nameEn: string
  descriptionVi: string
  descriptionEn: string
}

const EMPTY_FORM: FormState = {
  code: "",
  category: "VIRTUAL",
  icon: "",
  nameVi: "",
  nameEn: "",
  descriptionVi: "",
  descriptionEn: "",
}

export const ServiceFormDialog = ({
  open,
  onOpenChange,
  service,
}: ServiceFormDialogProps) => {
  const isEdit = Boolean(service)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const createMutation = useCreateService()
  const updateMutation = useUpdateService()

  useEffect(() => {
    if (service) {
      setForm({
        code: service.code,
        category: service.category,
        icon: service.icon ?? "",
        nameVi: service.name.vi ?? "",
        nameEn: service.name.en ?? "",
        descriptionVi: service.description?.vi ?? "",
        descriptionEn: service.description?.en ?? "",
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [service, open])

  const handleChange =
    (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const shared = {
      category: form.category,
      icon: form.icon,
      name: { vi: form.nameVi, en: form.nameEn },
      description: { vi: form.descriptionVi, en: form.descriptionEn },
    }

    if (isEdit && service) {
      updateMutation.mutate(
        { id: service.id, payload: shared },
        { onSuccess: () => onOpenChange(false) }
      )
      return
    }

    createMutation.mutate(
      { code: form.code, ...shared },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa dịch vụ" : "Tạo dịch vụ mới"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-code">Mã (không đổi sau khi tạo)</Label>
            <Input
              id="service-code"
              value={form.code}
              onChange={handleChange("code")}
              disabled={isEdit}
              placeholder="OFFICE_BASIC"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-category">Nhóm</Label>
            <select
              id="service-category"
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value }))
              }
              className="h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="VIRTUAL">VIRTUAL</option>
              <option value="PHYSICAL">PHYSICAL</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-icon">Icon (tên lucide)</Label>
            <Input
              id="service-icon"
              value={form.icon}
              onChange={handleChange("icon")}
              placeholder="FileText"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service-name-vi">Tên (VI)</Label>
              <Input
                id="service-name-vi"
                value={form.nameVi}
                onChange={handleChange("nameVi")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-name-en">Tên (EN)</Label>
              <Input
                id="service-name-en"
                value={form.nameEn}
                onChange={handleChange("nameEn")}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service-desc-vi">Mô tả (VI)</Label>
              <Input
                id="service-desc-vi"
                value={form.descriptionVi}
                onChange={handleChange("descriptionVi")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-desc-en">Mô tả (EN)</Label>
              <Input
                id="service-desc-en"
                value={form.descriptionEn}
                onChange={handleChange("descriptionEn")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isEdit ? "Lưu" : "Tạo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

Note: confirm `@/components/ui/dialog` exports `Dialog`, `DialogContent`, `DialogFooter`, `DialogHeader`, `DialogTitle` (search `components/ui/dialog`); correct the import if the repo names them differently. The category `<select>` is a plain element to avoid coupling to a specific shadcn Select API; swap for the repo's `Select` primitive if preferred. `companionship_level` and `rules` are optional in the API and omitted from this form for brevity; add them if the reviewer wants full parity.

- [ ] **Step 2: Verify types compile**

Run: `cd pr1as-client && npm run typecheck`
Expected: no errors (after fixing the `DialogFooter` import).

- [ ] **Step 3: Commit**

```bash
cd pr1as-client && git add components/dashboard/service-form-dialog.tsx
git commit -m "feat(service): add admin service create/edit form dialog"
```

---

## Task 12: Frontend — admin service management page

**Files:**
- Create: `pr1as-client/app/dashboard/services/page.tsx`

**Interfaces:**
- Consumes: hooks from Task 10, `ServiceFormDialog` (Task 11); shadcn/ui primitives.

- [ ] **Step 1: Build the management page**

Create `pr1as-client/app/dashboard/services/page.tsx`. It lists all services (active + deprecated), opens the form dialog for create/edit, toggles deprecate/reactivate, and deletes with the guardrail surfaced via toast.

```typescript
"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ServiceFormDialog } from "@/components/dashboard/service-form-dialog"
import {
  useAdminServices,
  useDeprecateService,
  useReactivateService,
  useDeleteService,
} from "@/lib/hooks/use-admin-services"
import type { AdminServiceItem } from "@/services/admin-service.service"

const ServicesAdminPage = () => {
  const { data: services, isLoading } = useAdminServices()
  const deprecateMutation = useDeprecateService()
  const reactivateMutation = useReactivateService()
  const deleteMutation = useDeleteService()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminServiceItem | null>(null)

  const handleCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const handleEdit = (service: AdminServiceItem) => {
    setEditing(service)
    setDialogOpen(true)
  }

  const handleDeprecate = (service: AdminServiceItem) => {
    setPendingId(service.id)
    deprecateMutation.mutate(service.id, {
      onSettled: () => setPendingId(null),
    })
  }

  const handleReactivate = (service: AdminServiceItem) => {
    setPendingId(service.id)
    reactivateMutation.mutate(service.id, {
      onSettled: () => setPendingId(null),
    })
  }

  const handleDelete = (service: AdminServiceItem) => {
    if (
      !window.confirm(
        `Xóa vĩnh viễn dịch vụ "${service.name.vi}"? Chỉ xóa được khi không còn worker hoặc booking nào dùng.`
      )
    ) {
      return
    }
    setPendingId(service.id)
    deleteMutation.mutate(service.id, {
      onSettled: () => setPendingId(null),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Đang tải" />
      </div>
    )
  }

  return (
    <section className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quản lý dịch vụ</h1>
        <Button onClick={handleCreate}>Tạo dịch vụ</Button>
      </header>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã</TableHead>
              <TableHead>Tên</TableHead>
              <TableHead>Nhóm</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(services ?? []).map((service) => {
              const isPending = pendingId === service.id
              return (
                <TableRow key={service.id}>
                  <TableCell className="font-mono text-sm">
                    {service.code}
                  </TableCell>
                  <TableCell>{service.name.vi}</TableCell>
                  <TableCell>{service.category}</TableCell>
                  <TableCell>
                    {service.is_active ? (
                      <Badge>Đang hoạt động</Badge>
                    ) : (
                      <Badge variant="secondary">Đã ngừng</Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleEdit(service)}
                    >
                      Sửa
                    </Button>
                    {service.is_active ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleDeprecate(service)}
                      >
                        Ngừng
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleReactivate(service)}
                      >
                        Bật lại
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleDelete(service)}
                    >
                      Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ServiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        service={editing}
      />
    </section>
  )
}

export default ServicesAdminPage
```

- [ ] **Step 2: Verify types compile**

Run: `cd pr1as-client && npm run typecheck`
Expected: no errors. If any `@/components/ui/*` import path is wrong for this repo, correct it to the actual location (search `components/ui`).

- [ ] **Step 3: Manually verify in the browser**

Run: `cd pr1as-client && npm run dev` (with the backend running). Log in as an admin, visit `http://localhost:3001/dashboard/services`.
Expected: the table lists services with status badges; "Tạo dịch vụ" opens the create dialog and adds a service; "Sửa" edits it (code field disabled); "Ngừng" flips a service to "Đã ngừng"; "Bật lại" restores it; "Xóa" on a service with workers/bookings shows the in-use toast and does not remove the row.

- [ ] **Step 4: Commit**

```bash
cd pr1as-client && git add app/dashboard/services/page.tsx
git commit -m "feat(service): add admin service management page"
```

---

## Task 13: Frontend — worker "new services available" banner

**Files:**
- Create: `pr1as-client/components/worker/new-services-banner.tsx`
- Modify: `pr1as-client/app/worker/setup/page.tsx`

**Interfaces:**
- Consumes: public services list (`serviceService.getServices` via a query) and the worker's own services (existing `queryKeys.workers.myServices` hook in `use-worker-setup.ts`).

- [ ] **Step 1: Inspect the existing worker-services hook**

Read `pr1as-client/lib/hooks/use-worker-setup.ts` to find the hook that returns the worker's current services (it queries `queryKeys.workers.myServices`). Note its exported name and the shape of each item (it exposes `service_id` / `service_code`). The banner needs the set of `service_code`s the worker already offers.

- [ ] **Step 2: Build the banner component**

Create `pr1as-client/components/worker/new-services-banner.tsx`. Replace `useMyWorkerServices` with the actual hook name found in Step 1, and `code` accessors with the actual field:

```typescript
"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { queryKeys } from "@/lib/query-keys"
import { serviceService } from "@/services/service.service"
import { useMyWorkerServices } from "@/lib/hooks/use-worker-setup"

export const NewServicesBanner = () => {
  const { data: allServices } = useQuery({
    queryKey: queryKeys.services.all,
    queryFn: () => serviceService.getServices(),
  })
  const { data: myServices } = useMyWorkerServices()

  const offeredCodes = new Set(
    (myServices ?? []).map((item) => item.service_code)
  )
  const missing = (allServices ?? []).filter(
    (service) => service.is_active && !offeredCodes.has(service.code)
  )

  if (missing.length === 0) {
    return null
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm">
        Có {missing.length} dịch vụ mới bạn chưa cung cấp. Thêm vào hồ sơ để
        nhận đặt lịch.
      </p>
      <Button asChild size="sm">
        <Link href="#services">Thêm dịch vụ</Link>
      </Button>
    </div>
  )
}
```

Note: `serviceService.getServices()` calls `GET /services`, which already returns only active services; the extra `service.is_active` filter is defensive. The `#services` anchor should point at the worker setup page's services section — adjust the href to the actual section id/route used by `app/worker/setup/page.tsx`.

- [ ] **Step 3: Render the banner on the worker setup page**

In `pr1as-client/app/worker/setup/page.tsx`, import and render `NewServicesBanner` near the top of the setup content (above the services configuration section):

```typescript
import { NewServicesBanner } from "@/components/worker/new-services-banner"
```

Place `<NewServicesBanner />` at the top of the page's main content JSX.

- [ ] **Step 4: Verify types compile**

Run: `cd pr1as-client && npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Manually verify in the browser**

Run the client + backend. As a worker who does not offer every active service, open `http://localhost:3001/worker/setup`.
Expected: the banner appears with the count of not-yet-offered services and hides once the worker offers all active services. As an admin, create a new service (Task 11 flow / API), then reload the worker setup page and confirm the banner count increases and an in-app notification arrives in the worker's bell.

- [ ] **Step 6: Commit**

```bash
cd pr1as-client && git add components/worker/new-services-banner.tsx app/worker/setup/page.tsx
git commit -m "feat(worker): add new-services opt-in banner on setup page"
```

---

## Final verification

- [ ] **Confirm discovery already excludes deprecated services (no code change)**

The spec (§4) requires auditing every service-listing query path so deprecated
services vanish from filters. Verified during planning:
- Public service list — `ServiceService.searchServices` defaults `is_active=true`
  (`src/services/service/service.service.ts`).
- Worker discovery — `findWorkersGroupedByService` has a `$match` on
  `"service.is_active": true` after the `$lookup`/`$unwind`
  (`src/repositories/worker/worker-service.repository.ts`, ~line 512).

Re-read both spots and confirm they still filter `is_active`. No change is
expected; if a new listing path was added, apply the same `is_active=true`
filter there.

- [ ] **Run the full backend test + typecheck**

Run: `cd SERVER && npx jest && npx tsc --noEmit`
Expected: all tests PASS, no type errors.

- [ ] **Run frontend typecheck + lint**

Run: `cd pr1as-client && npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Append a SESSIONS.md entry** summarizing the service-lifecycle feature (what changed, why), per the repo convention.
