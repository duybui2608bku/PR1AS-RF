# Memory Bank - Worker Question (Profile Q&A)

## Purpose

Worker questions are a public "Ask the worker" Q&A thread rendered on a worker
profile. Anyone (a guest or a logged-in user) can ask a worker a question, the
worker answers it from their own profile, and the asker is notified when the
first answer lands. It is independent of booking and chat: there is no
conversation, no realtime socket, and no participant membership - just a flat,
paginated list of question/answer pairs per worker.

Primary source files:

- Backend constants: `SERVER/src/constants/worker-question.ts`
- Backend types: `SERVER/src/types/worker-question.ts`
- Backend model: `SERVER/src/models/worker-question/worker-question.model.ts`
- Backend validation: `SERVER/src/validations/worker-question/worker-question.validation.ts`
- Backend repository: `SERVER/src/repositories/worker-question/worker-question.repository.ts`
- Backend service: `SERVER/src/services/worker-question/worker-question.service.ts`
- Backend controller: `SERVER/src/controllers/worker-question/worker-question.controller.ts`
- Backend routes: `SERVER/src/routes/worker-question/worker-question.routes.ts`
- Notification events: `SERVER/src/services/notification/notification-events.service.ts`
  (`workerQuestionCreated`, `workerQuestionAnswered`)
- Frontend component: `pr1as-client/components/worker/worker-ask-question.tsx`
- Frontend service: `pr1as-client/services/worker-question.service.ts`
- Frontend hooks: `pr1as-client/lib/hooks/use-worker-questions.ts`
- Frontend types: `pr1as-client/types/worker-question.ts`
- Mounted on the worker profile page: `pr1as-client/app/worker/[id]/page.tsx`

## Domain Model

Collection: `worker_question` (via `modelsName.WORKER_QUESTION`).

| Field | Meaning |
| --- | --- |
| `worker_id` | User being asked. Required, indexed. |
| `asker_id` | User who asked. `null` for guest askers. Indexed. |
| `asker_nickname` | Display name for the asker. Max 60 chars. For registered askers it is set from `full_name`; for guests it is the optional submitted nickname. |
| `asker_email` | Always stored, lowercased. From the account for registered askers, from the body for guests. Used to email guests their answer. |
| `question` | Plain-text question. Min 5, max 1000 chars. |
| `visibility` | `public` or `private`. Default `public`. Indexed. |
| `answer` | Plain-text worker answer. Max 2000 chars. `null` until answered. |
| `answered_at` | Timestamp of the first/last answer write. |
| `is_hidden` | Soft-hide flag (moderation). Hidden questions are excluded from listing and cannot be answered. Default `false`, indexed. |
| `created_at`, `updated_at` | Manual timestamps (`timestamps: false`). |

Indexes:

- `worker_id` (single)
- `asker_id` (single)
- `visibility` (single)
- `is_hidden` (single)
- Compound `worker_id + is_hidden + created_at(-1)` for the profile list query.

`WorkerQuestionVisibility` enum (`SERVER/src/constants/worker-question.ts`):

```ts
PUBLIC  = "public"
PRIVATE = "private"
```

Limits (`WORKER_QUESTION_LIMITS`):

| Key | Value |
| --- | --- |
| `MIN_QUESTION_LENGTH` | 5 |
| `MAX_QUESTION_LENGTH` | 1000 |
| `MIN_ANSWER_LENGTH` | 1 |
| `MAX_ANSWER_LENGTH` | 2000 |
| `MAX_NICKNAME_LENGTH` | 60 |
| `DEFAULT_PAGE` | 1 |
| `DEFAULT_LIMIT` | 20 |
| `MAX_LIMIT` | 50 |

`WORKER_QUESTION_MASK = "***"` is the placeholder shown for masked private
questions.

## API Surface

Mounted at `/api/worker-questions` (`SERVER/src/routes/index.ts`).

| Method | Path | Auth | CSRF | Rate limit | Purpose |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/` | Optional | Yes | `questionCreateLimiter` (10/hour) | Ask a worker. Guest or registered. |
| `GET` | `/worker/:workerId` | Optional | No | - | List a worker's questions, paginated and masked per viewer. |
| `POST` | `/:id/answer` | Worker | Yes | - | Worker answers (or edits an answer to) their own question. |

`POST /` is `optionalAuthenticate`: it works without a session (guest) and also
recognises a logged-in viewer. `GET /worker/:workerId` is also
`optionalAuthenticate` so the viewer identity can drive private-question masking.

### Create payload

`createWorkerQuestionSchema`:

```ts
{
  worker_id: ObjectId,
  question: string,                 // trimmed, 5..1000
  visibility?: "public" | "private", // default "public"
  nickname?: string,                // trimmed, max 60
  email?: string,                   // required for guests, ignored for registered
}
```

Create rules (`WorkerQuestionService.createQuestion`):

| Rule | Behaviour |
| --- | --- |
| Worker must exist and include the `WORKER` role. | Else `404 WORKER_NOT_FOUND`. |
| Logged-in viewer cannot ask themself. | `viewerId === workerId` -> `400 CANNOT_ASK_SELF`. |
| Registered asker. | `asker_id` set; `asker_email` and `asker_nickname` are taken from the account (`full_name`), not from the body. |
| Guest asker. | `email` is required (`400 EMAIL_REQUIRED` if missing); optional `nickname` is used as-is. |
| Question text is sanitised. | Stripped to plain text (all tags/attributes removed) via `sanitize-html` before storage. |
| Notification. | Emits `workerQuestionCreated` asynchronously; failures are logged, not surfaced. |

### List query and masking

`listWorkerQuestionsQuerySchema`: `page` (>=1, default 1), `limit`
(1..50, default 20). The repository returns only `is_hidden=false` rows sorted
`created_at` descending, plus a `total` for pagination meta.

Each row is projected to a `WorkerQuestionView` with per-viewer masking:

- A question is **masked** when `visibility=private` AND the viewer is neither
  the worker owner nor the original asker.
- When masked: `question`/`answer` become `***`/`null`, `asker_nickname`
  becomes `null`, and `is_masked=true`. `id`, `visibility`, and timestamps stay
  so the UI can still render a masked row.
- `can_answer` is `true` only for the worker viewing their own profile.
- `is_answered = Boolean(answer)`.

### Answer payload

`answerWorkerQuestionSchema`: `{ answer: string }` (trimmed, 1..2000).

Answer rules (`WorkerQuestionService.answerQuestion`):

| Rule | Behaviour |
| --- | --- |
| Route guards. | `authenticate` + `workerOnly` + CSRF. |
| Question must exist and not be hidden. | Else `404 QUESTION_NOT_FOUND`. |
| Only the owning worker may answer. | `question.worker_id !== workerId` -> `403 UNAUTHORIZED_ANSWER`. |
| Answer is sanitised. | Stripped to plain text before storage. |
| Editing is allowed. | Re-answering overwrites `answer` and `answered_at`. |
| Notify only on first answer. | `isFirstAnswer = !question.answer`; edits never re-notify the asker. |

## Notifications

Both events live in `notification-events.service.ts` and use category
`QUESTION` (`NotificationCategory.QUESTION`).

`workerQuestionCreated`:

- Recipient: the worker. Actor: the asker (`null` for guests).
- Type `WORKER_QUESTION_CREATED` (`worker_question.created`).
- Channels: in-app + email + push. Priority `HIGH`.
- Links to `/worker/:workerId`. Body includes a 160-char excerpt of the question.
- `dedupe_key`: `worker-question-created:<questionId>`.

`workerQuestionAnswered` (only on the first answer):

- Type `WORKER_QUESTION_ANSWERED` (`worker_question.answered`). Priority `NORMAL`.
- Registered asker: standard `notify()` to the asker, channels in-app + email.
- Guest asker (`asker_id` null): `notify()` would filter out a non-user, so the
  service emails `asker_email` directly instead.
- `dedupe_key`: `worker-question-answered:<questionId>`.

## Frontend

`components/worker/worker-ask-question.tsx` renders the whole Q&A section and is
mounted in the worker profile main column (`app/worker/[id]/page.tsx`,
`workerId` + `isOwnProfile` props).

Behaviour:

- The ask form is hidden when `isOwnProfile` is true (you cannot ask yourself).
- Guest vs authenticated: guests submit `nickname` + `email`; logged-in askers
  skip the contact fields (backend fills them from the account).
- Visibility toggle: `public` (anyone reads) vs `private` (only asker + worker),
  with helper hints.
- Masked private rows render the masked placeholder for non-involved viewers.
- The worker, on their own profile, sees an inline reply/edit form per question.

Data layer:

- Service: `workerQuestionService.getWorkerQuestions`, `createWorkerQuestion`,
  `answerWorkerQuestion` in `services/worker-question.service.ts`.
- Hooks: `useWorkerQuestions` (infinite query, page size 5),
  `useAskWorkerQuestion`, `useAnswerWorkerQuestion` in
  `lib/hooks/use-worker-questions.ts`. Mutations invalidate
  `queryKeys.workerQuestions.byWorker(workerId)`.
- Query keys: `workerQuestions.all` and
  `workerQuestions.byWorker(workerId, params?)` in `lib/query-keys.ts`.
- i18n: `WorkerProfile.askWorker.*` namespace in `messages/{en,vi,zh}.json`.

## Known Implementation Nuances

- `asker_email` is always persisted, including for registered askers, because it
  is the channel used to email guests their answer.
- `is_hidden` is a backend soft-hide guard (questions are filtered out of the
  list and cannot be answered), but there is currently no admin route in this
  module to set it - it is reserved for moderation/data tooling.
- Answer edits are intentionally silent: only the first answer notifies the
  asker, so workers can fix typos without re-emailing the guest.
- Question/answer text is stored as plain text; all HTML is stripped on the way
  in, so the UI can render the raw strings without sanitising again.
