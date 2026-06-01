# Test Plan — Overview & Setup

**Project:** Digital Marketing — AI Social Media Suite
**Scope of this test pack:** complete functional flow for every role **except AI generation**.
**Test style:** manual UI, step‑by‑step, with an expected result for every step + checklists.

---

## 1. What is in / out of scope

**In scope**
- Authentication: login, logout, session, role‑based route access
- Date‑window activation (activate / deactivate users for a date range)
- Super Admin: companies, company admins, platforms, content types, post types, post↔content mappings
- Company Admin: users, activation windows, grants (post types + content types), company isolation
- User: granted‑type visibility, Posts management (edit / status / schedule / delete), media attach
- End‑to‑end cross‑role scenario + negative paths

**Out of scope (excluded on request)**
- AI text generation itself (the "✨ Generate" action and provider/model output). The AI Studio screen is still opened to verify access and that only granted types appear — we simply do not run a generation.

---

## 2. Environment & setup

| Item | Value |
|------|-------|
| App URL | `http://localhost:3000` |
| Database | Supabase Postgres, schema **`seo`** |
| Migrations | `migrations/001…006` applied in order (see `migrations/README.md`) |

**Setup steps (once):**

1. `npm install`
2. Apply migrations **001 → 006 in order**: `npm run db:migrate` (or paste each `migrations/00x_*.sql` in order in the Supabase SQL editor / DataGrip).
3. `npm run dev` and open `http://localhost:3000`.
4. Confirm the login screen loads at `/login`.

> The migrations seed a demo company (**GrowUpMore**), one super admin, one company admin, four users, and the full platform/content/post‑type catalog. The test data sheet (`01_Test_Data.md`) lists everything plus the extra records you will create while testing.

**Migrations are idempotent** — re‑running 001–006 is safe (no errors, no duplicates). If you ever hit an `already exists` error (e.g., `42P07 relation "posts" already exists`) from an older run, either just re‑run 001–006, or for a clean slate run `migrations/reset.sql` once (drops only the `seo` schema) and then run 001–006 again. See `migrations/README.md` → Troubleshooting.

**Reset between full test passes (optional):** to start the data from scratch, run `migrations/reset.sql` then 001–006. This restores the seeded accounts in `01_Test_Data.md` and removes anything created during testing.

---

## 3. Seeded login accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `girish@growupmore.in` | `SuperAdmin@123` |
| Company Admin | `rahul@growupmore.in` | `Password@123` |
| User | `priya@growupmore.in` | `Password@123` |
| User | `amit@growupmore.in` | `Password@123` |
| User | `neha@growupmore.in` | `Password@123` |
| User (scheduled, not yet active) | `karan@growupmore.in` | `Password@123` |

Full details and the extra accounts you create during testing are in **`01_Test_Data.md`**.

---

## 4. How to use these documents

- Run the documents **in order** the first time (02 → 06). The end‑to‑end doc assumes the data created earlier.
- Each test has: a **Precondition**, a numbered **step table** (Action → Expected result), and a **checklist**.
- Mark each checklist item `[x]` pass or note the failure. Use the **Result** column: ✅ Pass / ❌ Fail / ⏭️ Skipped.
- "Sign out" between roles (top‑right avatar → Sign out) so cookies don't carry over, or use a separate browser/incognito window per role.

### Conventions
- **Bold** = a UI label or button. `code` = a value to type or a URL.
- A *toast* is the small message that appears bottom‑right after an action.
- "Effective status" = whether a user is treated as active **today** (enabled **and** inside their date window).

---

## 5. Document index

| # | Document | Covers |
|---|----------|--------|
| 00 | `00_Test_Plan_Overview.md` | This file — scope, setup, index |
| 01 | `01_Test_Data.md` | All sample data + credentials + date‑window matrix |
| 02 | `02_Authentication_Access_Control.md` | Login, logout, session, RBAC, date‑window, rate‑limit |
| 03 | `03_SuperAdmin_Flow.md` | Companies, admins, platforms, content types, post types, mappings |
| 04 | `04_CompanyAdmin_Flow.md` | Users, activation windows, grants, company isolation |
| 05 | `05_User_Flow.md` | Granted‑type visibility, posts management (non‑AI), media |
| 06 | `06_End_to_End_Scenario.md` | Full cross‑role run + negative paths |
| 07 | `07_Regression_Smoke_Checklist.md` | One‑page quick re‑test |
| 08 | `08_Content_Library_Flow.md` | Per‑company content categories & ideas, Studio idea‑picker |

---

## 6. Master sign‑off checklist

- [ ] 02 — Authentication & access control passed
- [ ] 03 — Super Admin flow passed
- [ ] 04 — Company Admin flow passed
- [ ] 05 — User flow (non‑AI) passed
- [ ] 06 — End‑to‑end scenario passed
- [ ] 07 — Regression smoke passed
- [ ] 08 — Content Library passed
- [ ] All blocking defects resolved / re‑tested

**Tester:** ____________________  **Build / commit:** ____________  **Date:** ____________
