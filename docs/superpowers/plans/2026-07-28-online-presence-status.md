# Online Presence Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show "online now" / "active X ago" status for users in chat (list + header), worker discovery cards, and the social post feed, sourced from the existing in-memory socket registry plus a new persisted `last_active_at` field.

**Architecture:** Backend persists `last_active_at` on `User` at socket connect/disconnect and computes `is_online` live from the existing in-memory `userSockets` map (`SERVER/src/config/socket.handlers.ts`) — no Redis, single instance. Chat gets a targeted realtime push (`presence:update` to each direct-chat partner's existing `user:<id>` room). Worker cards and the post feed get the field in their existing REST responses and refresh via `refetchInterval` polling. Frontend renders it through two shared, i18n-aware components: `PresenceText` (full text, chat) and `PresenceDot` (dot-only, cards/feed).

**Tech Stack:** Node.js/Express/TypeScript/Mongoose/Socket.IO backend; Next.js 16/React 19/TypeScript/TanStack Query/next-intl frontend. Backend tests: Jest (`ts-jest`, `SERVER/jest.config.js`, pattern `**/?(*.)+(spec|test).ts` under `SERVER/src`). Frontend has **no test runner configured** — verify frontend changes with `npm run typecheck` and manual verification in the browser (matches this repo's existing convention, e.g. `docs/superpowers/specs/2026-07-16-deposit-qr-expiry-design.md`'s plan, which used "typecheck + chạy tay" for FE).

## Global Constraints

- Applies to every user (client + worker), not just workers — confirmed in spec.
- No privacy toggle: presence is always public, no new setting.
- Time buckets: "online now" / "just now" / "N minutes ago" / "N hours ago" / "N days ago"; **hide entirely** (render nothing) once `last_active_at` is more than 30 days old, or when it is `null`.
- Worker sort: boost tier (featured/basic/none) stays the **primary** sort key; online status is only a **tie-break within the same tier** — never let it outrank a higher boost tier.
- Chat gets full text (`PresenceText`); worker cards and post feed get a dot only, hidden entirely when offline (`PresenceDot`).
- Presence applies to **direct chat only**, not group chat; not shown for admin accounts.
- No Redis/pub-sub — backend runs a single instance (confirmed: no PM2 cluster config, no `ioredis` dependency).
- i18n: any new user-facing string must be added to all 4 locale files — `pr1as-client/messages/{vi,en,zh,ko}.json` (`vi` is default).
- Frontend conventions: no semicolons, Tailwind-only styling, `"use client"` where hooks/state are used, `cn()` from `@/lib/utils` for conditional classes.
- Backend conventions: async/await, layered routes → controllers → services → repositories → models; `noUnusedLocals`/`noUnusedParameters`/`noImplicitReturns` are enforced by `tsc` — keep new code clean of unused imports/params.
- Conventional Commits for every commit in this plan (`feat`, `test`, etc.), imperative mood, no trailing period.

---

### Task 1: User model — persisted `last_active_at` field

**Files:**
- Modify: `SERVER/src/types/auth/user.types.ts:88` (inside `IUser` interface, right after `last_login: Date | null;`)
- Modify: `SERVER/src/models/auth/user.model.ts:133-136` (right after the `last_login` schema field)
- Test: `SERVER/src/models/auth/user.model.test.ts` (new file)

**Interfaces:**
- Produces: `IUser.last_active_at: Date | null` and the matching Mongoose schema field, both consumed by every later task that reads or writes this field.

- [ ] **Step 1: Write the failing test**

Create `SERVER/src/models/auth/user.model.test.ts`:

```ts
import { User } from "./user.model";

describe("User model - last_active_at", () => {
  it("defaults last_active_at to null on a new document", () => {
    const user = new User({
      email: "presence-test@example.com",
      full_name: "Presence Test",
    });

    expect(user.last_active_at).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest src/models/auth/user.model.test.ts -v`
Expected: FAIL — `Property 'last_active_at' does not exist` (TypeScript compile error via ts-jest) or `undefined` is not `null`.

- [ ] **Step 3: Add the field to the type and schema**

In `SERVER/src/types/auth/user.types.ts`, change:

```ts
  created_at: Date;
  last_login: Date | null;
  refresh_token_hash?: string | null;
```

to:

```ts
  created_at: Date;
  last_login: Date | null;
  last_active_at: Date | null;
  refresh_token_hash?: string | null;
```

In `SERVER/src/models/auth/user.model.ts`, change:

```ts
    last_login: {
      type: Date,
      default: null,
    },
    refresh_token_hash: {
```

to:

```ts
    last_login: {
      type: Date,
      default: null,
    },
    last_active_at: {
      type: Date,
      default: null,
      index: true,
    },
    refresh_token_hash: {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest src/models/auth/user.model.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add SERVER/src/types/auth/user.types.ts SERVER/src/models/auth/user.model.ts SERVER/src/models/auth/user.model.test.ts
git commit -m "feat(user): add last_active_at field for presence tracking"
```

---

### Task 2: Bulk online-status lookup

**Files:**
- Modify: `SERVER/src/config/socket.handlers.ts` (add export near existing `isUserOnline`, around line 115-118)
- Test: `SERVER/src/config/__tests__/socket-online-bulk.test.ts` (new file)

**Interfaces:**
- Consumes: existing `userSockets` map and `isUserOnline(userId: string): boolean`, `registerUserSocket(userId, socketId)`, `unregisterUserSocket(userId, socketId)` (all already exported from this file, unchanged by this task).
- Produces: `isUserOnlineBulk(userIds: string[]): Set<string>` — used by Task 5 (worker sort) and Task 4 (chat conversation list).

- [ ] **Step 1: Write the failing test**

Create `SERVER/src/config/__tests__/socket-online-bulk.test.ts`:

```ts
import {
  registerUserSocket,
  unregisterUserSocket,
  isUserOnlineBulk,
} from "../socket.handlers";

describe("isUserOnlineBulk", () => {
  afterEach(() => {
    unregisterUserSocket("user-1", "socket-1");
  });

  it("returns only the ids that currently have an active socket", () => {
    registerUserSocket("user-1", "socket-1");

    expect(isUserOnlineBulk(["user-1", "user-2", "user-3"])).toEqual(
      new Set(["user-1"])
    );
  });

  it("returns an empty set when none of the ids are online", () => {
    expect(isUserOnlineBulk(["user-2", "user-3"])).toEqual(new Set());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest src/config/__tests__/socket-online-bulk.test.ts -v`
Expected: FAIL — `isUserOnlineBulk is not a function` / TypeScript error that it isn't exported.

- [ ] **Step 3: Implement**

In `SERVER/src/config/socket.handlers.ts`, right after the existing `isUserOnline` export:

```ts
export const isUserOnline = (userId: string): boolean => {
  return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
};

export const isUserOnlineBulk = (userIds: string[]): Set<string> => {
  const online = new Set<string>();
  for (const userId of userIds) {
    if (isUserOnline(userId)) {
      online.add(userId);
    }
  }
  return online;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest src/config/__tests__/socket-online-bulk.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add SERVER/src/config/socket.handlers.ts SERVER/src/config/__tests__/socket-online-bulk.test.ts
git commit -m "feat(socket): add bulk online-status lookup"
```

---

### Task 3: Persist last-active + broadcast presence on connect/disconnect

**Files:**
- Modify: `SERVER/src/constants/socket.ts` (add one event name)
- Modify: `SERVER/src/repositories/chat/conversation.repository.ts` (add `listDirectPartnerIds`)
- Modify: `SERVER/src/repositories/auth/user.repository.ts` (add `updateLastActiveNow`)
- Modify: `SERVER/src/config/socket.handlers.ts` (`registerUserSocket`, `unregisterUserSocket`, new `handlePresenceTransition`)
- Test: `SERVER/src/config/__tests__/socket-presence-broadcast.test.ts` (new file)

**Interfaces:**
- Consumes: `isUserOnline` (Task 2, for the "was offline before this connect" check), `getUserRoom(userId)` from `SERVER/src/utils/chat.helper.ts` (already imported in this file), `getSocketIO()` from `SERVER/src/config/socket.ts` (already imported).
- Produces: socket event `SOCKET_EVENTS.PRESENCE_UPDATE = "presence:update"` with payload `{ user_id: string, is_online: boolean, last_active_at: string }`, emitted to `user:<partnerId>` for every direct-chat partner of the user who just came online/offline. Also produces `conversationRepository.listDirectPartnerIds(userId): Promise<string[]>` and `userRepository.updateLastActiveNow(id): Promise<void>`, consumed only inside this task.

- [ ] **Step 1: Add the socket event constant**

In `SERVER/src/constants/socket.ts`, change:

```ts
  TOKEN_REFRESH_REQUIRED: "auth:token_refresh_required",
  TOKEN_REFRESH: "auth:token_refresh",
  TOKEN_REFRESHED: "auth:token_refreshed",
} as const;
```

to:

```ts
  TOKEN_REFRESH_REQUIRED: "auth:token_refresh_required",
  TOKEN_REFRESH: "auth:token_refresh",
  TOKEN_REFRESHED: "auth:token_refreshed",
  PRESENCE_UPDATE: "presence:update",
} as const;
```

- [ ] **Step 2: Add `listDirectPartnerIds` to the conversation repository**

In `SERVER/src/repositories/chat/conversation.repository.ts`, right after the `getUserConversations` method (after its closing `}` on line 92, before `updateConversationLastMessage`):

```ts
  async listDirectPartnerIds(user_id: string): Promise<string[]> {
    const conversations = await Conversation.find({
      $or: [{ sender_id: user_id }, { receiver_id: user_id }],
    })
      .select("sender_id receiver_id")
      .lean();

    return conversations.map((conv) =>
      conv.sender_id.toString() === user_id
        ? conv.receiver_id.toString()
        : conv.sender_id.toString()
    );
  }
```

- [ ] **Step 3: Add `updateLastActiveNow` to the user repository**

In `SERVER/src/repositories/auth/user.repository.ts`, right after `updateLastActiveRole` (after its closing `}` around line 336):

```ts
  async updateLastActiveNow(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, { last_active_at: new Date() });
  }
```

- [ ] **Step 4: Write the failing test for the presence broadcast**

Create `SERVER/src/config/__tests__/socket-presence-broadcast.test.ts`:

```ts
jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: { updateLastActiveNow: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("../../repositories/chat/conversation.repository", () => ({
  conversationRepository: { listDirectPartnerIds: jest.fn() },
}));
jest.mock("../socket", () => ({
  getSocketIO: jest.fn(),
}));

import { userRepository } from "../../repositories/auth/user.repository";
import { conversationRepository } from "../../repositories/chat/conversation.repository";
import { getSocketIO } from "../socket";
import { registerUserSocket, unregisterUserSocket } from "../socket.handlers";
import { SOCKET_EVENTS } from "../../constants/socket";

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

describe("presence transition broadcast", () => {
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));

  beforeEach(() => {
    jest.clearAllMocks();
    (getSocketIO as jest.Mock).mockReturnValue({ to });
    (conversationRepository.listDirectPartnerIds as jest.Mock).mockResolvedValue([
      "partner-1",
      "partner-2",
    ]);
  });

  afterEach(() => {
    unregisterUserSocket("user-1", "socket-1");
    unregisterUserSocket("user-1", "socket-2");
  });

  it("emits presence:update to every direct-chat partner room when the user's first socket connects", async () => {
    registerUserSocket("user-1", "socket-1");
    await flushMicrotasks();

    expect(userRepository.updateLastActiveNow).toHaveBeenCalledWith("user-1");
    expect(to).toHaveBeenCalledWith("user:partner-1");
    expect(to).toHaveBeenCalledWith("user:partner-2");
    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.PRESENCE_UPDATE,
      expect.objectContaining({ user_id: "user-1", is_online: true })
    );
  });

  it("does not re-broadcast when a second socket for the same user connects", async () => {
    registerUserSocket("user-1", "socket-1");
    await flushMicrotasks();
    jest.clearAllMocks();

    registerUserSocket("user-1", "socket-2");
    await flushMicrotasks();

    expect(userRepository.updateLastActiveNow).not.toHaveBeenCalled();
    expect(to).not.toHaveBeenCalled();
  });

  it("emits is_online: false only when the last socket disconnects", async () => {
    registerUserSocket("user-1", "socket-1");
    registerUserSocket("user-1", "socket-2");
    await flushMicrotasks();
    jest.clearAllMocks();

    unregisterUserSocket("user-1", "socket-1");
    await flushMicrotasks();
    expect(to).not.toHaveBeenCalled();

    unregisterUserSocket("user-1", "socket-2");
    await flushMicrotasks();
    expect(emit).toHaveBeenCalledWith(
      SOCKET_EVENTS.PRESENCE_UPDATE,
      expect.objectContaining({ user_id: "user-1", is_online: false })
    );
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd SERVER && npx jest src/config/__tests__/socket-presence-broadcast.test.ts -v`
Expected: FAIL — no `presence:update` emitted yet, `to`/`emit` not called.

- [ ] **Step 6: Implement the connect/disconnect presence transition**

In `SERVER/src/config/socket.handlers.ts`, add this import alongside the existing ones at the top:

```ts
import { conversationRepository } from "../repositories/chat/conversation.repository";
```

Replace the existing `registerUserSocket` and `unregisterUserSocket` functions:

```ts
export const registerUserSocket = (userId: string, socketId: string): void => {
  const wasOffline = !isUserOnline(userId);

  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(socketId);
  logger.info(`User ${userId} connected with socket ${socketId}`);

  if (wasOffline) {
    void handlePresenceTransition(userId, true);
  }
};

export const unregisterUserSocket = (
  userId: string,
  socketId: string
): void => {
  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      userSockets.delete(userId);
      void handlePresenceTransition(userId, false);
    }
  }
  logger.info(`User ${userId} disconnected socket ${socketId}`);
};
```

Add this function right after `isUserOnlineBulk` (from Task 2):

```ts
/**
 * Persists the online/offline transition and notifies direct-chat partners
 * so their conversation list/header can update without a manual refresh.
 * Fire-and-forget from registerUserSocket/unregisterUserSocket — a failure
 * here must never block the socket handshake or disconnect cleanup, so every
 * awaited call is wrapped in its own try/catch.
 */
const handlePresenceTransition = async (
  userId: string,
  isOnline: boolean
): Promise<void> => {
  const now = new Date();

  try {
    await userRepository.updateLastActiveNow(userId);
  } catch (error) {
    logger.error(`Failed to persist last_active_at for user ${userId}:`, error);
  }

  try {
    const partnerIds = await conversationRepository.listDirectPartnerIds(userId);
    const io = getSocketIO();
    const payload = {
      user_id: userId,
      is_online: isOnline,
      last_active_at: now.toISOString(),
    };
    for (const partnerId of partnerIds) {
      io.to(getUserRoom(partnerId)).emit(SOCKET_EVENTS.PRESENCE_UPDATE, payload);
    }
  } catch (error) {
    logger.error(`Failed to broadcast presence for user ${userId}:`, error);
  }
};
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd SERVER && npx jest src/config/__tests__/socket-presence-broadcast.test.ts -v`
Expected: PASS

Also re-run Task 2's test to confirm it still passes (it now triggers real fire-and-forget calls internally, but they're caught and logged, not thrown):
Run: `cd SERVER && npx jest src/config/__tests__/socket-online-bulk.test.ts -v`
Expected: PASS (you may see `Failed to persist last_active_at...` / `Failed to broadcast presence...` error logs printed — that's expected noise from the unmocked DB/socket calls in that test file, not a failure).

- [ ] **Step 8: Commit**

```bash
git add SERVER/src/constants/socket.ts SERVER/src/repositories/chat/conversation.repository.ts SERVER/src/repositories/auth/user.repository.ts SERVER/src/config/socket.handlers.ts SERVER/src/config/__tests__/socket-presence-broadcast.test.ts
git commit -m "feat(socket): persist last_active_at and broadcast presence to chat partners"
```

---

### Task 4: Chat REST responses include presence

**Files:**
- Modify: `SERVER/src/types/chat/chat.types.ts:64-77` (`ConversationWithLastMessage.other_user`)
- Modify: `SERVER/src/services/chat/chat.service.ts` (`getConversations`, `getConversation`)
- Test: `SERVER/src/services/chat/__tests__/chat-presence.test.ts` (new file)

**Interfaces:**
- Consumes: `isUserOnline`, `isUserOnlineBulk` (Task 2), `userRepository.findById`/`findManyByIds` (unchanged — `last_active_at` is already present on the returned lean docs once Task 1 lands, no repository change needed here).
- Produces: `ConversationWithLastMessage.other_user.presence: { is_online: boolean; last_active_at: Date | null }`, consumed by Task 8 (frontend chat rendering).

- [ ] **Step 1: Add the `presence` field to the type**

In `SERVER/src/types/chat/chat.types.ts`, change:

```ts
export interface ConversationWithLastMessage extends IConversation {
  last_message_data?: IMessage;
  other_user?: {
    _id: string;
    full_name: string | null;
    avatar: string | null;
    email: string;
    status?: string;
    is_blocked?: boolean;
    has_blocked_me?: boolean;
    block_profile?: boolean;
  };
  unread_count?: number;
}
```

to:

```ts
export interface ConversationWithLastMessage extends IConversation {
  last_message_data?: IMessage;
  other_user?: {
    _id: string;
    full_name: string | null;
    avatar: string | null;
    email: string;
    status?: string;
    is_blocked?: boolean;
    has_blocked_me?: boolean;
    block_profile?: boolean;
    presence?: {
      is_online: boolean;
      last_active_at: Date | null;
    };
  };
  unread_count?: number;
}
```

- [ ] **Step 2: Write the failing test**

Create `SERVER/src/services/chat/__tests__/chat-presence.test.ts`:

```ts
jest.mock("../../../repositories/chat/chat.repository", () => ({
  chatRepository: { getConversationWithDetails: jest.fn() },
}));
jest.mock("../../../repositories/auth/user.repository", () => ({
  userRepository: { findById: jest.fn() },
}));
jest.mock("../../../repositories/moderation", () => ({
  moderationRepository: { findBlock: jest.fn().mockResolvedValue(null) },
}));
jest.mock("../../../config/socket.handlers", () => ({
  isUserOnline: jest.fn(),
  isUserOnlineBulk: jest.fn(),
}));
jest.mock("../../../config/socket", () => ({ getSocketIO: jest.fn() }));

import { chatService } from "../chat.service";
import { chatRepository } from "../../../repositories/chat/chat.repository";
import { userRepository } from "../../../repositories/auth/user.repository";
import { isUserOnline } from "../../../config/socket.handlers";
import { UserRole } from "../../../types/auth/user.types";

describe("chatService.getConversation presence", () => {
  const conversation = {
    _id: "conv-1",
    sender_id: "user-1",
    receiver_id: "user-2",
    last_message: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (chatRepository.getConversationWithDetails as jest.Mock).mockResolvedValue({
      conversation,
      last_message: undefined,
      unread_count: 0,
    });
  });

  const mockUsers = (otherLastActiveAt: Date | null) => {
    (userRepository.findById as jest.Mock).mockImplementation((id: string) => {
      if (id === "user-1") {
        return Promise.resolve({ _id: "user-1", roles: [UserRole.CLIENT] });
      }
      return Promise.resolve({
        _id: "user-2",
        full_name: "Worker Two",
        avatar: null,
        email: "w2@example.com",
        status: "active",
        roles: [UserRole.WORKER],
        last_active_at: otherLastActiveAt,
      });
    });
  };

  it("marks the other user online with their last_active_at when their socket is connected", async () => {
    const lastActiveAt = new Date("2026-07-28T10:00:00.000Z");
    mockUsers(lastActiveAt);
    (isUserOnline as jest.Mock).mockReturnValue(true);

    const result = await chatService.getConversation("user-1", "conv-1");

    expect(result?.other_user?.presence).toEqual({
      is_online: true,
      last_active_at: lastActiveAt,
    });
  });

  it("reports offline with last_active_at when the other user has no active socket", async () => {
    const lastActiveAt = new Date("2026-07-27T09:00:00.000Z");
    mockUsers(lastActiveAt);
    (isUserOnline as jest.Mock).mockReturnValue(false);

    const result = await chatService.getConversation("user-1", "conv-1");

    expect(result?.other_user?.presence).toEqual({
      is_online: false,
      last_active_at: lastActiveAt,
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd SERVER && npx jest src/services/chat/__tests__/chat-presence.test.ts -v`
Expected: FAIL — `result?.other_user?.presence` is `undefined`.

- [ ] **Step 4: Implement in `chat.service.ts`**

Add this import alongside the existing ones at the top of `SERVER/src/services/chat/chat.service.ts`:

```ts
import { isUserOnline, isUserOnlineBulk } from "../../config/socket.handlers";
```

In `getConversations`, right after the block that builds `otherUserIds` (after its closing `);` following `getOtherUserId(...)` mapping, i.e. right before `const lastMessageIds = ...`), add one line so the online set is computed once for the whole page:

```ts
    const otherUserIds = result.conversations.map((conv: IConversation) =>
      getOtherUserId(
        conv.sender_id.toString(),
        conv.receiver_id.toString(),
        user_id
      )
    );
    const onlineUserIds = isUserOnlineBulk(otherUserIds);
```

Then, in the same method, change the `enrichedConversations` map's `other_user` object from:

```ts
          other_user: formattedUser
            ? {
                ...formattedUser,
                is_blocked: Boolean(block?.outgoing),
                has_blocked_me: Boolean(block?.incoming),
                block_profile: Boolean(block?.outgoing?.block_profile),
              }
            : formattedUser,
```

to:

```ts
          other_user: formattedUser
            ? {
                ...formattedUser,
                is_blocked: Boolean(block?.outgoing),
                has_blocked_me: Boolean(block?.incoming),
                block_profile: Boolean(block?.outgoing?.block_profile),
                presence: {
                  is_online: onlineUserIds.has(otherUserId),
                  last_active_at: otherUser?.last_active_at ?? null,
                },
              }
            : formattedUser,
```

In `getConversation`, change:

```ts
    const otherUser = await userRepository.findById(otherUserId);
    const [outgoingBlock, incomingBlock] = await Promise.all([
      moderationRepository.findBlock(user_id, otherUserId),
      moderationRepository.findBlock(otherUserId, user_id),
    ]);
    const formattedUser = formatOtherUser(otherUser);

    return {
      ...result.conversation,
      last_message_data: result.last_message,
      other_user: formattedUser
        ? {
            ...formattedUser,
            is_blocked: Boolean(outgoingBlock),
            has_blocked_me: Boolean(incomingBlock),
            block_profile: Boolean(outgoingBlock?.block_profile),
          }
        : formattedUser,
      unread_count: result.unread_count,
    };
```

to:

```ts
    const otherUser = await userRepository.findById(otherUserId);
    const [outgoingBlock, incomingBlock] = await Promise.all([
      moderationRepository.findBlock(user_id, otherUserId),
      moderationRepository.findBlock(otherUserId, user_id),
    ]);
    const formattedUser = formatOtherUser(otherUser);

    return {
      ...result.conversation,
      last_message_data: result.last_message,
      other_user: formattedUser
        ? {
            ...formattedUser,
            is_blocked: Boolean(outgoingBlock),
            has_blocked_me: Boolean(incomingBlock),
            block_profile: Boolean(outgoingBlock?.block_profile),
            presence: {
              is_online: isUserOnline(otherUserId),
              last_active_at: otherUser?.last_active_at ?? null,
            },
          }
        : formattedUser,
      unread_count: result.unread_count,
    };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd SERVER && npx jest src/services/chat/__tests__/chat-presence.test.ts -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add SERVER/src/types/chat/chat.types.ts SERVER/src/services/chat/chat.service.ts SERVER/src/services/chat/__tests__/chat-presence.test.ts
git commit -m "feat(chat): include presence on conversation responses"
```

---

### Task 5: Worker discovery — presence field + sort tie-break

**Files:**
- Modify: `SERVER/src/repositories/worker/worker-service.repository.ts` (aggregation pipeline + return types, ~lines 474-491, 672-690, 703-739)
- Modify: `SERVER/src/types/worker/worker.types.ts:57-90` (`WorkersGroupedByServiceItem`)
- Modify: `SERVER/src/services/worker/worker.service.ts` (sort key extraction + `presence` field, ~lines 510-556)
- Test: `SERVER/src/services/worker/worker-sort.test.ts` (new file)

**Interfaces:**
- Consumes: `isUserOnlineBulk` (Task 2).
- Produces: `getWorkerBoostSortKey(workerId, boostByWorkerId, onlineWorkerIds, slotId): [number, number, number]` (exported from `worker.service.ts`, tested directly); each worker in `WorkersGroupedByServiceItem.workers` now has `last_active_at: Date | null` and `presence: { is_online: boolean; last_active_at: Date | null }`, consumed by Task 9 (frontend worker card).

- [ ] **Step 1: Add `last_active_at` to the aggregation pipeline and types**

In `SERVER/src/repositories/worker/worker-service.repository.ts`, in the `findWorkersGroupedByService` method's declared return type (around line 489), change:

```ts
        reputation_score: number;
        pricing: WorkerServicePricing[];
      }>;
    }>
  > {
```

to:

```ts
        reputation_score: number;
        last_active_at: Date | null;
        pricing: WorkerServicePricing[];
      }>;
    }>
  > {
```

In the same file's `$group` stage (around line 672-690), change:

```ts
              reputation_score: {
                $ifNull: ["$worker.meta_data.reputation_score", 100],
              },
              pricing: "$pricing",
            },
          },
        },
      },
```

to:

```ts
              reputation_score: {
                $ifNull: ["$worker.meta_data.reputation_score", 100],
              },
              last_active_at: { $ifNull: ["$worker.last_active_at", null] },
              pricing: "$pricing",
            },
          },
        },
      },
```

In the same file's `result.map` inline type (around line 722-738), change:

```ts
          reputation_score: number;
          pricing: WorkerServicePricing[];
        }>;
      }) => ({
        service: item.service,
        workers: item.workers,
      })
    );
  }
```

to:

```ts
          reputation_score: number;
          last_active_at: Date | null;
          pricing: WorkerServicePricing[];
        }>;
      }) => ({
        service: item.service,
        workers: item.workers,
      })
    );
  }
```

In `SERVER/src/types/worker/worker.types.ts`, in `WorkersGroupedByServiceItem`, change:

```ts
    pricing: WorkerServicePricing[];
    boost?: {
      is_boosted: boolean;
      boost_type: string | null;
      boost_tier: number | null; // 1=featured, 2=basic, null=none
    };
  }>;
}
```

to:

```ts
    pricing: WorkerServicePricing[];
    boost?: {
      is_boosted: boolean;
      boost_type: string | null;
      boost_tier: number | null; // 1=featured, 2=basic, null=none
    };
    presence?: {
      is_online: boolean;
      last_active_at: Date | null;
    };
  }>;
}
```

- [ ] **Step 2: Write the failing test for the sort key**

Create `SERVER/src/services/worker/worker-sort.test.ts`:

```ts
import { getWorkerBoostSortKey } from "./worker.service";

describe("getWorkerBoostSortKey", () => {
  const slotId = 100;

  it("ranks a featured-boosted worker ahead of an online unboosted worker", () => {
    const boostByWorkerId = new Map([["worker-featured", { tier: 1 }]]);
    const onlineWorkerIds = new Set(["worker-online"]);

    const featuredKey = getWorkerBoostSortKey(
      "worker-featured",
      boostByWorkerId,
      onlineWorkerIds,
      slotId
    );
    const onlineKey = getWorkerBoostSortKey(
      "worker-online",
      boostByWorkerId,
      onlineWorkerIds,
      slotId
    );

    expect(featuredKey[0]).toBeLessThan(onlineKey[0]);
  });

  it("ranks an online worker ahead of an offline worker within the same (no-boost) tier", () => {
    const boostByWorkerId = new Map<string, { tier: number }>();
    const onlineWorkerIds = new Set(["worker-aaaa1111"]);

    const onlineKey = getWorkerBoostSortKey(
      "worker-aaaa1111",
      boostByWorkerId,
      onlineWorkerIds,
      slotId
    );
    const offlineKey = getWorkerBoostSortKey(
      "worker-bbbb2222",
      boostByWorkerId,
      onlineWorkerIds,
      slotId
    );

    expect(onlineKey[0]).toBe(offlineKey[0]);
    expect(onlineKey[1]).toBeLessThan(offlineKey[1]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd SERVER && npx jest src/services/worker/worker-sort.test.ts -v`
Expected: FAIL — `getWorkerBoostSortKey` is not exported from `worker.service.ts`.

- [ ] **Step 4: Implement in `worker.service.ts`**

Add this import alongside the existing ones at the top of `SERVER/src/services/worker/worker.service.ts`:

```ts
import { isUserOnlineBulk } from "../../config/socket.handlers";
```

Add this exported function at module scope, right after `calculateSuggestionScore` and before `export class WorkerService {`:

```ts
// Sort key for worker discovery: boost tier first (paid ranking is preserved),
// then online-now as a tie-break within the same tier, then a deterministic
// scatter so equal-priority workers rotate exposure over time.
export const getWorkerBoostSortKey = (
  workerId: string,
  boostByWorkerId: Map<string, { tier: number }>,
  onlineWorkerIds: Set<string>,
  slotId: number
): [number, number, number] => {
  const boost = boostByWorkerId.get(workerId);
  const tier = boost ? boost.tier : 999;
  const onlineRank = onlineWorkerIds.has(workerId) ? 0 : 1;
  // Cheap deterministic scatter within same tier using last 4 hex chars of id
  const scatter = (parseInt(workerId.slice(-4), 16) + slotId) % 1000;
  return [tier, onlineRank, scatter];
};
```

Inside `getWorkersGroupedByService`, change:

```ts
    const boostByWorkerId = new Map(activeBoosts.map((b) => [b.user_id, b]));

    // Deterministic rotation: slot changes every rotation_interval_minutes so
    // all boosted workers at the same tier get equal exposure over time.
    const slotId = Math.floor(
      Date.now() / (boostConfig.rotation_interval_minutes * 60 * 1000)
    );

    const getBoostSortKey = (workerId: string): [number, number] => {
      const boost = boostByWorkerId.get(workerId);
      const tier = boost ? boost.tier : 999;
      // Cheap deterministic scatter within same tier using last 4 hex chars of id
      const scatter = (parseInt(workerId.slice(-4), 16) + slotId) % 1000;
      return [tier, scatter];
    };

    const groupedWithBoost = groupedWorkers.map((group) => ({
      ...group,
      workers: group.workers
        .map((w) => {
          const boost = boostByWorkerId.get(w.id);
          return {
            ...w,
            boost: {
              is_boosted: Boolean(boost),
              boost_type: boost ? (boost.tier === 1 ? "featured" : "basic") : null,
              boost_tier: boost ? boost.tier : null,
            },
          };
        })
        .sort((a, b) => {
          const [tierA, scatterA] = getBoostSortKey(a.id);
          const [tierB, scatterB] = getBoostSortKey(b.id);
          if (tierA !== tierB) return tierA - tierB;
          return scatterA - scatterB;
        }),
    }));
```

to:

```ts
    const boostByWorkerId = new Map(activeBoosts.map((b) => [b.user_id, b]));
    const onlineWorkerIds = isUserOnlineBulk(allWorkerIds);

    // Deterministic rotation: slot changes every rotation_interval_minutes so
    // all boosted workers at the same tier get equal exposure over time.
    const slotId = Math.floor(
      Date.now() / (boostConfig.rotation_interval_minutes * 60 * 1000)
    );

    const groupedWithBoost = groupedWorkers.map((group) => ({
      ...group,
      workers: group.workers
        .map((w) => {
          const boost = boostByWorkerId.get(w.id);
          return {
            ...w,
            boost: {
              is_boosted: Boolean(boost),
              boost_type: boost ? (boost.tier === 1 ? "featured" : "basic") : null,
              boost_tier: boost ? boost.tier : null,
            },
            presence: {
              is_online: onlineWorkerIds.has(w.id),
              last_active_at: w.last_active_at ?? null,
            },
          };
        })
        .sort((a, b) => {
          const [tierA, onlineA, scatterA] = getWorkerBoostSortKey(
            a.id,
            boostByWorkerId,
            onlineWorkerIds,
            slotId
          );
          const [tierB, onlineB, scatterB] = getWorkerBoostSortKey(
            b.id,
            boostByWorkerId,
            onlineWorkerIds,
            slotId
          );
          if (tierA !== tierB) return tierA - tierB;
          if (onlineA !== onlineB) return onlineA - onlineB;
          return scatterA - scatterB;
        }),
    }));
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd SERVER && npx jest src/services/worker/worker-sort.test.ts -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add SERVER/src/repositories/worker/worker-service.repository.ts SERVER/src/types/worker/worker.types.ts SERVER/src/services/worker/worker.service.ts SERVER/src/services/worker/worker-sort.test.ts
git commit -m "feat(worker): add presence field and online tie-break to discovery sort"
```

---

### Task 6: Post author presence

**Files:**
- Modify: `SERVER/src/repositories/post/post.repository.ts:11-12` (`AUTHOR_PUBLIC_FIELDS`)
- Modify: `SERVER/src/types/post/post.types.ts:85-93` (`AuthorPublic`)
- Modify: `SERVER/src/services/post/post.service.ts` (`LeanPostWithAuthor`, `toAuthorPublic`)
- Test: `SERVER/src/services/post/__tests__/post-author-presence.test.ts` (new file)

**Interfaces:**
- Consumes: `isUserOnline` (Task 2).
- Produces: `AuthorPublic.presence: { is_online: boolean; last_active_at: Date | null }`, consumed by Task 10 (frontend post card). `toAuthorPublic` becomes exported for direct unit testing.

- [ ] **Step 1: Add `last_active_at` to the author projection**

In `SERVER/src/repositories/post/post.repository.ts`, change:

```ts
const AUTHOR_PUBLIC_FIELDS =
  "full_name avatar worker_profile meta_data.pricing_plan_code";
```

to:

```ts
const AUTHOR_PUBLIC_FIELDS =
  "full_name avatar worker_profile meta_data.pricing_plan_code last_active_at";
```

- [ ] **Step 2: Add `presence` to the `AuthorPublic` type**

In `SERVER/src/types/post/post.types.ts`, change:

```ts
export interface AuthorPublic {
  id: string;
  full_name: string | null;
  avatar: string | null;
  has_worker_profile: boolean;
  meta_data?: {
    pricing_plan_code?: string | null;
  };
}
```

to:

```ts
export interface AuthorPublic {
  id: string;
  full_name: string | null;
  avatar: string | null;
  has_worker_profile: boolean;
  meta_data?: {
    pricing_plan_code?: string | null;
  };
  presence: {
    is_online: boolean;
    last_active_at: Date | null;
  };
}
```

- [ ] **Step 3: Write the failing test**

Create `SERVER/src/services/post/__tests__/post-author-presence.test.ts`:

```ts
jest.mock("../../../config/socket.handlers", () => ({
  isUserOnline: jest.fn(),
}));

import { Types } from "mongoose";
import { toAuthorPublic } from "../post.service";
import { isUserOnline } from "../../../config/socket.handlers";

describe("toAuthorPublic presence", () => {
  it("reports the author online with their last_active_at when connected", () => {
    (isUserOnline as jest.Mock).mockReturnValue(true);
    const lastActiveAt = new Date("2026-07-28T08:00:00.000Z");
    const authorId = new Types.ObjectId();

    const post = {
      author_id: {
        _id: authorId,
        full_name: "Author One",
        avatar: null,
        worker_profile: null,
        meta_data: { pricing_plan_code: "STANDARD" },
        last_active_at: lastActiveAt,
      },
    } as any;

    const result = toAuthorPublic(post, authorId);

    expect(result.presence).toEqual({ is_online: true, last_active_at: lastActiveAt });
  });

  it("falls back to an offline, no-presence author when author_id failed to populate", () => {
    const fallbackId = new Types.ObjectId();
    const post = { author_id: null } as any;

    const result = toAuthorPublic(post, fallbackId);

    expect(result.presence).toEqual({ is_online: false, last_active_at: null });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd SERVER && npx jest src/services/post/__tests__/post-author-presence.test.ts -v`
Expected: FAIL — `toAuthorPublic` is not exported.

- [ ] **Step 5: Implement in `post.service.ts`**

Add this import alongside the existing ones at the top of `SERVER/src/services/post/post.service.ts`:

```ts
import { isUserOnline } from "../../config/socket.handlers";
```

Change:

```ts
type LeanPostWithAuthor = IPostDocument & {
  author_id: Pick<
    IUserDocument,
    "_id" | "full_name" | "avatar" | "worker_profile" | "meta_data"
  > | null;
};
```

to:

```ts
type LeanPostWithAuthor = IPostDocument & {
  author_id: Pick<
    IUserDocument,
    "_id" | "full_name" | "avatar" | "worker_profile" | "meta_data" | "last_active_at"
  > | null;
};
```

Change:

```ts
const toAuthorPublic = (
  post: LeanPostWithAuthor,
  fallbackId: Types.ObjectId
) => {
  const populated = post.author_id;
  if (populated && typeof populated === "object" && "_id" in populated) {
    return {
      id: populated._id.toString(),
      full_name: populated.full_name ?? null,
      avatar: populated.avatar ?? null,
      has_worker_profile: !!populated.worker_profile,
      meta_data: {
        pricing_plan_code: populated.meta_data?.pricing_plan_code ?? null,
      },
    };
  }
  return {
    id: fallbackId.toString(),
    full_name: null,
    avatar: null,
    has_worker_profile: false,
  };
};
```

to:

```ts
export const toAuthorPublic = (
  post: LeanPostWithAuthor,
  fallbackId: Types.ObjectId
) => {
  const populated = post.author_id;
  if (populated && typeof populated === "object" && "_id" in populated) {
    const authorId = populated._id.toString();
    return {
      id: authorId,
      full_name: populated.full_name ?? null,
      avatar: populated.avatar ?? null,
      has_worker_profile: !!populated.worker_profile,
      meta_data: {
        pricing_plan_code: populated.meta_data?.pricing_plan_code ?? null,
      },
      presence: {
        is_online: isUserOnline(authorId),
        last_active_at: populated.last_active_at ?? null,
      },
    };
  }
  return {
    id: fallbackId.toString(),
    full_name: null,
    avatar: null,
    has_worker_profile: false,
    presence: { is_online: false, last_active_at: null },
  };
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd SERVER && npx jest src/services/post/__tests__/post-author-presence.test.ts -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add SERVER/src/repositories/post/post.repository.ts SERVER/src/types/post/post.types.ts SERVER/src/services/post/post.service.ts SERVER/src/services/post/__tests__/post-author-presence.test.ts
git commit -m "feat(post): include author presence in post responses"
```

---

### Task 7: Frontend — shared presence hook, i18n, and components

**Files:**
- Create: `pr1as-client/lib/hooks/use-presence.ts`
- Create: `pr1as-client/components/shared/presence-dot.tsx`
- Create: `pr1as-client/components/shared/presence-text.tsx`
- Modify: `pr1as-client/messages/vi.json`, `en.json`, `zh.json`, `ko.json` (new `Presence` namespace)

**Interfaces:**
- Produces: `PresenceInfo` type, `usePresenceLabel(presence): string | null`, `<PresenceDot presence className />`, `<PresenceText presence className />` — all consumed by Tasks 8-10.

- [ ] **Step 1: Add the `Presence` i18n namespace to all 4 locale files**

Run this once per locale (adjust the object literal's Vietnamese/English/Chinese/Korean text per file — values below):

```bash
cd pr1as-client && node -e "
const fs = require('fs');
const path = 'messages/vi.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
data.Presence = {
  online: 'Đang online',
  justNow: 'Vừa hoạt động',
  minutesAgo: 'Hoạt động {count} phút trước',
  hoursAgo: 'Hoạt động {count} giờ trước',
  daysAgo: 'Hoạt động {count} ngày trước'
};
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
"
```

```bash
cd pr1as-client && node -e "
const fs = require('fs');
const path = 'messages/en.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
data.Presence = {
  online: 'Online now',
  justNow: 'Active just now',
  minutesAgo: 'Active {count}m ago',
  hoursAgo: 'Active {count}h ago',
  daysAgo: 'Active {count}d ago'
};
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
"
```

```bash
cd pr1as-client && node -e "
const fs = require('fs');
const path = 'messages/zh.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
data.Presence = {
  online: '在线',
  justNow: '刚刚活跃',
  minutesAgo: '{count} 分钟前活跃',
  hoursAgo: '{count} 小时前活跃',
  daysAgo: '{count} 天前活跃'
};
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
"
```

```bash
cd pr1as-client && node -e "
const fs = require('fs');
const path = 'messages/ko.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
data.Presence = {
  online: '온라인',
  justNow: '방금 활동함',
  minutesAgo: '{count}분 전 활동',
  hoursAgo: '{count}시간 전 활동',
  daysAgo: '{count}일 전 활동'
};
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
"
```

Verify all 4 files are still valid JSON and contain the new namespace:

Run: `cd pr1as-client && for f in vi en zh ko; do node -e "console.log('$f', require('./messages/'+'$f'+'.json').Presence.online)"; done`
Expected: prints the `online` string for each of the 4 locales with no errors.

- [ ] **Step 2: Create the presence hook**

Create `pr1as-client/lib/hooks/use-presence.ts`:

```ts
"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

export type PresenceInfo = {
  is_online: boolean
  last_active_at: string | null
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const HIDE_AFTER_MS = 30 * DAY_MS
const REFRESH_INTERVAL_MS = 30_000

export function usePresenceLabel(
  presence: PresenceInfo | null | undefined
): string | null {
  const t = useTranslations("Presence")
  const [, forceTick] = React.useReducer((n: number) => n + 1, 0)

  React.useEffect(() => {
    if (presence?.is_online) return
    const id = setInterval(forceTick, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [presence?.is_online])

  if (!presence) return null
  if (presence.is_online) return t("online")
  if (!presence.last_active_at) return null

  const diffMs = Date.now() - new Date(presence.last_active_at).getTime()
  if (diffMs < MINUTE_MS) return t("justNow")
  if (diffMs < HOUR_MS) {
    return t("minutesAgo", { count: Math.floor(diffMs / MINUTE_MS) })
  }
  if (diffMs < DAY_MS) {
    return t("hoursAgo", { count: Math.floor(diffMs / HOUR_MS) })
  }
  if (diffMs < HIDE_AFTER_MS) {
    return t("daysAgo", { count: Math.floor(diffMs / DAY_MS) })
  }
  return null
}
```

- [ ] **Step 3: Create `PresenceDot`**

Create `pr1as-client/components/shared/presence-dot.tsx`:

```tsx
"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePresenceLabel, type PresenceInfo } from "@/lib/hooks/use-presence"
import { cn } from "@/lib/utils"

export function PresenceDot({
  presence,
  className,
}: {
  presence?: PresenceInfo | null
  className?: string
}) {
  const label = usePresenceLabel(presence)
  if (!presence?.is_online) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "block size-2.5 rounded-full border-2 border-background bg-green-500",
              className
            )}
          />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

- [ ] **Step 4: Create `PresenceText`**

Create `pr1as-client/components/shared/presence-text.tsx`:

```tsx
"use client"

import { usePresenceLabel, type PresenceInfo } from "@/lib/hooks/use-presence"
import { cn } from "@/lib/utils"

export function PresenceText({
  presence,
  className,
}: {
  presence?: PresenceInfo | null
  className?: string
}) {
  const label = usePresenceLabel(presence)
  if (!label) return null

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {label}
    </span>
  )
}
```

- [ ] **Step 5: Verify with typecheck**

Run: `cd pr1as-client && npm run typecheck`
Expected: no new errors from the 3 new files (existing unrelated errors, if any, are out of scope).

- [ ] **Step 6: Commit**

```bash
git add pr1as-client/lib/hooks/use-presence.ts pr1as-client/components/shared/presence-dot.tsx pr1as-client/components/shared/presence-text.tsx pr1as-client/messages/vi.json pr1as-client/messages/en.json pr1as-client/messages/zh.json pr1as-client/messages/ko.json
git commit -m "feat(presence): add shared presence hook and display components"
```

---

### Task 8: Chat frontend — realtime presence

**Files:**
- Modify: `pr1as-client/services/chat.service.ts:36-50` (`ChatConversation.other_user`)
- Modify: `pr1as-client/lib/chat-socket.ts` (`ServerToClientEvents`)
- Modify: `pr1as-client/components/chat/chat-page.tsx` (socket listener + render `PresenceText`)

**Interfaces:**
- Consumes: `PresenceText` (Task 7), `queryKeys.chat.directConversationsRoot` / `directConversation(id)` (already exist in `pr1as-client/lib/query-keys.ts`), `activeDirectIdRef` (already exists in `chat-page.tsx`).
- Produces: `ChatConversation.other_user.presence` type consumed at render time; no new exports for later tasks (this is a leaf task).

- [ ] **Step 1: Add `presence` to the `ChatConversation` type**

In `pr1as-client/services/chat.service.ts`, change:

```ts
  other_user?: {
    _id: string
    full_name: string | null
    avatar: string | null
    email: string
    status?: string
    is_blocked?: boolean
    has_blocked_me?: boolean
    block_profile?: boolean
    meta_data?: {
      pricing_plan_code?: string | null
    }
  }
```

to:

```ts
  other_user?: {
    _id: string
    full_name: string | null
    avatar: string | null
    email: string
    status?: string
    is_blocked?: boolean
    has_blocked_me?: boolean
    block_profile?: boolean
    presence?: {
      is_online: boolean
      last_active_at: string | null
    }
    meta_data?: {
      pricing_plan_code?: string | null
    }
  }
```

- [ ] **Step 2: Add the `presence:update` event type**

In `pr1as-client/lib/chat-socket.ts`, change:

```ts
  error: (payload: { message?: string } | Error) => void
  "notification:new": (payload: NotificationPayload) => void
  "notification:unread_count": (payload: { unread_count: number }) => void
  "account:banned": () => void
}
```

to:

```ts
  error: (payload: { message?: string } | Error) => void
  "notification:new": (payload: NotificationPayload) => void
  "notification:unread_count": (payload: { unread_count: number }) => void
  "account:banned": () => void
  "presence:update": (payload: {
    user_id: string
    is_online: boolean
    last_active_at: string | null
  }) => void
}
```

- [ ] **Step 3: Register the socket listener in `chat-page.tsx`**

Add the import at the top of `pr1as-client/components/chat/chat-page.tsx` alongside the other local component imports:

```ts
import { PresenceText } from "@/components/shared/presence-text"
```

Inside the existing socket-listener `useEffect` (the one registering `new_message`, `message_deleted`, etc.), change:

```ts
    socket.on("new_message", handleNewMessage)
    socket.on("message_deleted", handleDeletedMessage)
    socket.on("message_read", handleMessageRead)
    socket.on("messages_read", handleDirectRead)
    socket.on("group_messages_read", handleGroupRead)
    socket.on("user_typing", handleTyping)
    socket.on("group_user_typing", handleGroupTyping)
    socket.on("error", handleSocketError)

    return () => {
      socket.off("new_message", handleNewMessage)
      socket.off("message_deleted", handleDeletedMessage)
      socket.off("message_read", handleMessageRead)
      socket.off("messages_read", handleDirectRead)
      socket.off("group_messages_read", handleGroupRead)
      socket.off("user_typing", handleTyping)
      socket.off("group_user_typing", handleGroupTyping)
      socket.off("error", handleSocketError)
    }
```

to:

```ts
    const handlePresenceUpdate = () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.directConversationsRoot,
      })
      if (activeDirectIdRef.current) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.chat.directConversation(activeDirectIdRef.current),
        })
      }
    }

    socket.on("new_message", handleNewMessage)
    socket.on("message_deleted", handleDeletedMessage)
    socket.on("message_read", handleMessageRead)
    socket.on("messages_read", handleDirectRead)
    socket.on("group_messages_read", handleGroupRead)
    socket.on("user_typing", handleTyping)
    socket.on("group_user_typing", handleGroupTyping)
    socket.on("presence:update", handlePresenceUpdate)
    socket.on("error", handleSocketError)

    return () => {
      socket.off("new_message", handleNewMessage)
      socket.off("message_deleted", handleDeletedMessage)
      socket.off("message_read", handleMessageRead)
      socket.off("messages_read", handleDirectRead)
      socket.off("group_messages_read", handleGroupRead)
      socket.off("user_typing", handleTyping)
      socket.off("group_user_typing", handleGroupTyping)
      socket.off("presence:update", handlePresenceUpdate)
      socket.off("error", handleSocketError)
    }
```

(This relies on `activeDirectIdRef` already being defined and kept up to date earlier in the same component — it is, and is already read a few lines above inside `handleNewMessage`.)

- [ ] **Step 4: Render `PresenceText` in the conversation header**

In the same file, change:

```tsx
                <h2
                  className={cn(
                    "flex min-w-0 items-center gap-1.5 truncate text-base font-semibold",
                    isActiveDirectAdmin && "text-sky-700 dark:text-sky-300"
                  )}
                >
                  <span className="truncate">{activeTitle}</span>
                  {isActiveDirectAdmin ? (
                    <AdminVerifiedBadge withLabel />
                  ) : null}
                  {mode === "direct" && selectedDirectUserBanned ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-950/50 dark:text-red-400">
                      <Ban className="size-3" />
                      {t("banned")}
                    </span>
                  ) : null}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {activeSubtitle}
                </p>
              </div>
            </div>
```

to:

```tsx
                <h2
                  className={cn(
                    "flex min-w-0 items-center gap-1.5 truncate text-base font-semibold",
                    isActiveDirectAdmin && "text-sky-700 dark:text-sky-300"
                  )}
                >
                  <span className="truncate">{activeTitle}</span>
                  {isActiveDirectAdmin ? (
                    <AdminVerifiedBadge withLabel />
                  ) : null}
                  {mode === "direct" && selectedDirectUserBanned ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-950/50 dark:text-red-400">
                      <Ban className="size-3" />
                      {t("banned")}
                    </span>
                  ) : null}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {activeSubtitle}
                </p>
                {mode === "direct" ? (
                  <PresenceText presence={selectedDirect?.other_user?.presence} />
                ) : null}
              </div>
            </div>
```

- [ ] **Step 5: Render `PresenceText` in the conversation list item**

In the same file, change:

```tsx
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
              <p
                className={cn(
                  "mt-1 truncate text-xs text-muted-foreground",
                  needsResponse && "font-medium text-red-600 dark:text-red-400"
                )}
              >
                {lastMessage}
              </p>
            </div>
```

to:

```tsx
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
              {isDirect ? (
                <PresenceText presence={directConversation?.other_user?.presence} />
              ) : null}
              <p
                className={cn(
                  "mt-1 truncate text-xs text-muted-foreground",
                  needsResponse && "font-medium text-red-600 dark:text-red-400"
                )}
              >
                {lastMessage}
              </p>
            </div>
```

- [ ] **Step 6: Verify with typecheck**

Run: `cd pr1as-client && npm run typecheck`
Expected: no new errors.

- [ ] **Step 7: Manual verification**

With both dev servers running (`SERVER` on its configured port, `pr1as-client` on 3000/3001):
1. Log in as two different users (e.g. two browser profiles) who already have a direct conversation.
2. Open `/chat` as both users, select the conversation.
3. Close/reopen one browser tab (or log out) and confirm the other user's conversation list item and open header show "Đang online" / "Hoạt động X trước" and update within a few seconds of the socket disconnecting/reconnecting.

- [ ] **Step 8: Commit**

```bash
git add pr1as-client/services/chat.service.ts pr1as-client/lib/chat-socket.ts pr1as-client/components/chat/chat-page.tsx
git commit -m "feat(chat): show realtime presence in conversation list and header"
```

---

### Task 9: Worker card frontend

**Files:**
- Modify: `pr1as-client/services/worker.service.ts:120-150` (`WorkerGroupedByService.workers` item type)
- Modify: `pr1as-client/components/worker/workers-by-service-list.tsx` (render `PresenceDot`)
- Modify: `pr1as-client/components/home/home-search-experience.tsx:133-138` (`refetchInterval`)

**Interfaces:**
- Consumes: `PresenceDot` (Task 7).
- Produces: none (leaf task).

- [ ] **Step 1: Add `presence` to the worker item type**

In `pr1as-client/services/worker.service.ts`, change:

```ts
    boost?: {
      is_boosted: boolean
      boost_type: "basic" | "featured" | null
      boost_tier: number | null
    }
  }>
}
```

to:

```ts
    boost?: {
      is_boosted: boolean
      boost_type: "basic" | "featured" | null
      boost_tier: number | null
    }
    presence: {
      is_online: boolean
      last_active_at: string | null
    }
  }>
}
```

- [ ] **Step 2: Render the dot on the worker card image**

In `pr1as-client/components/worker/workers-by-service-list.tsx`, add this import alongside the existing ones:

```ts
import { PresenceDot } from "@/components/shared/presence-dot"
```

Change:

```tsx
            {worker.boost?.boost_tier === 2 && (
              <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                <Zap className="h-2.5 w-2.5" /> {t("boost.active")}
              </div>
            )}
          </div>
```

to:

```tsx
            {worker.boost?.boost_tier === 2 && (
              <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                <Zap className="h-2.5 w-2.5" /> {t("boost.active")}
              </div>
            )}
            <PresenceDot
              presence={worker.presence}
              className="absolute bottom-2 right-2"
            />
          </div>
```

- [ ] **Step 3: Poll the worker list every 60s**

In `pr1as-client/components/home/home-search-experience.tsx`, change:

```ts
  const workersQuery = useQuery({
    queryKey: ["workers", "grouped-by-service", filters],
    queryFn: () => workerService.getWorkersGroupedByService(filters),
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
  })
```

to:

```ts
  const workersQuery = useQuery({
    queryKey: ["workers", "grouped-by-service", filters],
    queryFn: () => workerService.getWorkersGroupedByService(filters),
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
    refetchInterval: 60_000,
  })
```

- [ ] **Step 4: Verify with typecheck**

Run: `cd pr1as-client && npm run typecheck`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

Open the home page worker discovery section (`/`, or wherever `home-search-experience.tsx` renders) while logged in as a worker in another tab/session. Confirm a small green dot appears on that worker's card image while their socket is connected, and disappears within ~60s after they disconnect. Confirm featured/basic-boosted workers still visually rank above unboosted workers regardless of online status.

- [ ] **Step 6: Commit**

```bash
git add pr1as-client/services/worker.service.ts pr1as-client/components/worker/workers-by-service-list.tsx pr1as-client/components/home/home-search-experience.tsx
git commit -m "feat(worker): show online presence dot on worker cards"
```

---

### Task 10: Post feed frontend

**Files:**
- Modify: `pr1as-client/types/index.ts:39-47` (`PostAuthor`)
- Modify: `pr1as-client/components/post/post-card.tsx` (`AuthorAvatar` + call sites)
- Modify: `pr1as-client/lib/hooks/use-posts.ts:44-53` (`useListFeed` — `refetchInterval`)

**Interfaces:**
- Consumes: `PresenceDot` (Task 7).
- Produces: none (leaf task).

- [ ] **Step 1: Add `presence` to `PostAuthor`**

In `pr1as-client/types/index.ts`, change:

```ts
export type PostAuthor = {
  id: string
  full_name: string | null
  avatar: string | null
  has_worker_profile: boolean
  meta_data?: {
    pricing_plan_code?: string | null
  }
}
```

to:

```ts
export type PostAuthor = {
  id: string
  full_name: string | null
  avatar: string | null
  has_worker_profile: boolean
  meta_data?: {
    pricing_plan_code?: string | null
  }
  presence: {
    is_online: boolean
    last_active_at: string | null
  }
}
```

- [ ] **Step 2: Render the dot on the post author avatar**

In `pr1as-client/components/post/post-card.tsx`, add this import alongside the existing ones:

```ts
import { PresenceDot } from "@/components/shared/presence-dot"
```

Change:

```tsx
function AuthorAvatar({
  avatar,
  name,
  planCode,
}: {
  avatar: string | null
  name: string | null
  planCode?: string | null
}) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name ?? "Avatar"}
        width={40}
        height={40}
        className={cn(
          "size-10 rounded-full object-cover",
          getPlanRingClass(planCode)
        )}
      />
    )
  }
  return (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-full bg-muted",
        getPlanRingClass(planCode)
      )}
    >
      <User className="size-5 text-muted-foreground" />
    </div>
  )
}
```

to:

```tsx
function AuthorAvatar({
  avatar,
  name,
  planCode,
  presence,
}: {
  avatar: string | null
  name: string | null
  planCode?: string | null
  presence?: PostPublic["author"]["presence"]
}) {
  return (
    <div className="relative shrink-0">
      {avatar ? (
        <Image
          src={avatar}
          alt={name ?? "Avatar"}
          width={40}
          height={40}
          className={cn(
            "size-10 rounded-full object-cover",
            getPlanRingClass(planCode)
          )}
        />
      ) : (
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-full bg-muted",
            getPlanRingClass(planCode)
          )}
        >
          <User className="size-5 text-muted-foreground" />
        </div>
      )}
      <PresenceDot
        presence={presence}
        className="absolute bottom-0 right-0 ring-2 ring-background"
      />
    </div>
  )
}
```

Change both call sites:

```tsx
              <AuthorAvatar
                avatar={post.author.avatar}
                name={post.author.full_name}
                planCode={post.author.meta_data?.pricing_plan_code}
              />
            </Link>
          ) : (
            <AuthorAvatar
              avatar={post.author.avatar}
              name={post.author.full_name}
              planCode={post.author.meta_data?.pricing_plan_code}
            />
          )}
```

to:

```tsx
              <AuthorAvatar
                avatar={post.author.avatar}
                name={post.author.full_name}
                planCode={post.author.meta_data?.pricing_plan_code}
                presence={post.author.presence}
              />
            </Link>
          ) : (
            <AuthorAvatar
              avatar={post.author.avatar}
              name={post.author.full_name}
              planCode={post.author.meta_data?.pricing_plan_code}
              presence={post.author.presence}
            />
          )}
```

- [ ] **Step 3: Poll the feed every 60s**

In `pr1as-client/lib/hooks/use-posts.ts`, change:

```ts
export function useListFeed(params: Omit<PostFeedParams, "cursor"> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.feed(params as Record<string, unknown>),
    queryFn: ({ pageParam }) =>
      postService.listFeed({ ...params, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.next_cursor ?? undefined) : undefined,
  })
}
```

to:

```ts
export function useListFeed(params: Omit<PostFeedParams, "cursor"> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.feed(params as Record<string, unknown>),
    queryFn: ({ pageParam }) =>
      postService.listFeed({ ...params, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.next_cursor ?? undefined) : undefined,
    refetchInterval: 60_000,
  })
}
```

- [ ] **Step 4: Verify with typecheck**

Run: `cd pr1as-client && npm run typecheck`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

Open `/posts` (or wherever the feed renders) while logged in as a post author in another session. Confirm a small green dot appears on that author's avatar while they're connected, disappears within ~60s of disconnecting, and that scrolling further into the feed (loading more pages) still works normally — the periodic refetch must not reset scroll position or duplicate/reorder already-loaded posts.

- [ ] **Step 6: Commit**

```bash
git add pr1as-client/types/index.ts pr1as-client/components/post/post-card.tsx pr1as-client/lib/hooks/use-posts.ts
git commit -m "feat(post): show online presence dot on post author avatar"
```

---

## After all tasks

- Update [SESSIONS.md](../../SESSIONS.md) per its template: what changed, why, and any leftover work (e.g., group-chat presence and a per-user privacy toggle were explicitly descoped — see the design spec).
- Consider running the backend's full suite once (`cd SERVER && npx jest`) to confirm nothing else regressed.
