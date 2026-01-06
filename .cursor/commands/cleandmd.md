# AI CODE RULES – CLEAN & ENTERPRISE STANDARD

This document defines STRICT rules that all AI-generated or AI-modified code in this repository MUST follow.
Any violation is considered INVALID OUTPUT.

====================================================================

1. NO COMMENTS – ZERO COMMENT POLICY

- Absolutely no usage of //, /\* _/, /\*\* _/
- No inline explanations
- No documentation comments
- Code must be self-explanatory through naming and structure only

====================================================================

2. NO HARDCODE – ABSOLUTE RULE

2.1 Strings

FORBIDDEN:
throw new Error("error")

REQUIRED:
throw new AppError(PaginationErrorCode.LIMIT_INVALID)

2.2 Numbers (Magic Numbers)

FORBIDDEN:
if (limit > 50)

REQUIRED:
if (limit > PaginationLimit.MAX)

2.3 Time, Date, Timeout

FORBIDDEN:
setTimeout(fn, 3000)

REQUIRED:
setTimeout(fn, Timeout.SHORT)

====================================================================

3. ENUM-FIRST DESIGN

- All fixed values MUST be defined using enum or const
- No inline literals
- Enums must be centralized in /constants or /enums

Example:

export enum PaginationErrorCode {
LIMIT_INVALID = "PAGINATION_LIMIT_INVALID",
PAGE_INVALID = "PAGINATION_PAGE_INVALID"
}

====================================================================

4. ERROR HANDLING STANDARD

- NEVER throw raw Error
- NEVER hardcode error messages
- Errors must be typed, reusable, and centralized

Example:

throw new AppError(AuthErrorCode.UNAUTHORIZED)

====================================================================

5. NAMING CONVENTIONS

5.1 Functions

- Use Verb + Object
- Must clearly describe responsibility

FORBIDDEN:
handle()
process()
doStuff()

REQUIRED:
validatePaginationParams()
createAccessToken()
fetchUserProfile()

5.2 Variables

- No abbreviations
- No meaningless names

FORBIDDEN:
const res = fn(u)

REQUIRED:
const userProfile = fetchUserProfile(userId)

====================================================================

6. REUSABILITY OVER DUPLICATION

- No duplicated logic
- No copy-paste
- Extract shared logic into:
  - validators
  - helpers
  - mappers
  - transformers

====================================================================

7. SINGLE RESPONSIBILITY PRINCIPLE

- One function = one responsibility
- One file = one domain concern

FORBIDDEN:
auth.service.ts handling login, token, email, logging

REQUIRED:
auth/
auth.service.ts
token.service.ts
auth.validator.ts

====================================================================

8. IMMUTABILITY RULE

- Never mutate function parameters
- Never reassign input objects

FORBIDDEN:
user.role = UserRole.ADMIN

REQUIRED:
const updatedUser = { ...user, role: UserRole.ADMIN }

====================================================================

9. TYPESCRIPT STRICT MODE

- any is forbidden
- Explicit return types are required
- Prefer unknown, generics, and strict typing

FORBIDDEN:
function parse(data: any)

REQUIRED:
function parse<T>(data: unknown): T

====================================================================

10. CONFIGURATION ISOLATION

- No environment access inside business logic
- No process.env usage outside config layer

REQUIRED STRUCTURE:

config/
env.config.ts
app.config.ts

====================================================================

FINAL RULE

AI MUST FOLLOW THIS FILE AS A SYSTEM CONTRACT.
DO NOT EXPLAIN.
DO NOT COMMENT.
ONLY OUTPUT CLEAN, REUSABLE, ENUM-BASED CODE.
