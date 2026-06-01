# 06 — End‑to‑End Scenario + Negative Paths

**Goal:** run one continuous, realistic flow that touches all three roles, then confirm the key negative paths. Uses a fresh company so it won't collide with earlier data.
**Precondition:** app running, you are signed out. AI generation excluded throughout.

Result key: ✅ Pass · ❌ Fail · ⏭️ Skipped

---

## Scenario data (create as you go)

| Thing | Value |
|-------|-------|
| Company | `Bright Labs` / slug `bright-labs` |
| Company Admin | `Dev Admin` · `dev@bright.test` · `Bright@123` |
| User (active) | `Field User` · `field@bright.test` · `Field@123` · window **today → today+30** |
| User (disabled) | `Temp User` · `temp@bright.test` · `Temp@123` · enabled **OFF** |

---

## Stage 1 — Super Admin provisions a tenant

| Step | Action | Expected |
|------|--------|----------|
| 1 | Sign in as `girish@growupmore.in` / `SuperAdmin@123` | Dashboard (super) |
| 2 | **Companies → + New company** → `Bright Labs` → Save | Bright Labs created, active |
| 3 | **Company Admins → + New admin** → company **Bright Labs**, `Dev Admin`, `dev@bright.test`, `Bright@123` | Admin created and mapped to Bright Labs |
| 4 | Spot‑check **Platforms / Content Types / Post Types** still list the full catalog | Catalog intact |
| 5 | Sign out | Back to `/login` |

- [ ] Company + admin provisioned by Super Admin

---

## Stage 2 — Company Admin onboards a user

| Step | Action | Expected |
|------|--------|----------|
| 1 | Sign in as `dev@bright.test` / `Bright@123` | Admin dashboard; **Team** empty |
| 2 | **Team → + Add user** → `Field User`, `field@bright.test`, `Field@123`, **Active from = today**, **Active to = today+30**, enabled ON | User active, window shown |
| 3 | **+ Add user** → `Temp User`, `temp@bright.test`, `Temp@123`, **enabled OFF** | User inactive |
| 4 | On **Field User**, open the **0 post types** chip → grant **Instagram → Feed Post, Story** → **Save grants** | Chip shows **2 post types** |
| 5 | Sign out | — |

- [ ] Active user created with a date window
- [ ] Disabled user created
- [ ] Grants assigned to the active user

---

## Stage 3 — User works within their grants (no AI)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Sign in as `field@bright.test` / `Field@123` | User dashboard; **Granted post types = 2** |
| 2 | **AI Studio** → open **Platform** | Only **Instagram** appears |
| 3 | Open **Post type** | Only **Feed Post** and **Story** appear (no Reel/Carousel) |
| 4 | (Do not generate.) Open Console and create a draft via `01_Test_Data.md` §E using an Instagram Feed Post id from `/api/ai/options` | Draft created |
| 5 | **Posts** → reload | Draft card visible (status **draft**) |
| 6 | **Edit** → change body, **Status = approved** → Save | Badge **approved** |
| 7 | **Edit** → **Status = scheduled**, pick future time → Save | Badge **scheduled**, time shown |
| 8 | **Delete** the post → confirm | Removed |
| 9 | Sign out | — |

- [ ] User only sees granted Instagram post types
- [ ] User can manage a post end‑to‑end (draft → approved → scheduled → deleted)

---

## Stage 4 — Negative paths

| # | Action | Expected |
|---|--------|----------|
| 1 | Sign in as `temp@bright.test` (disabled) | ❌ "Your account has been deactivated." |
| 2 | As Company Admin, edit **Field User** → **Active from = today + 3** → Save; then try to log in as Field User | ❌ "Your access is not active for today's date." (then revert the date) |
| 3 | Signed in as **Field User**, visit `/companies` | Redirected to `/dashboard` |
| 4 | Signed in as **Field User**, visit `/users` | Redirected to `/dashboard` |
| 5 | Signed in as **Dev Admin**, visit `/platforms` | Redirected to `/dashboard` |
| 6 | As **Dev Admin → Team**, confirm only Bright Labs users show | GrowUpMore / Acme users **not** visible |
| 7 | Sign in with a wrong password for any account | ❌ "Invalid email or password." |

- [ ] Disabled login blocked
- [ ] Future‑dated user blocked (date activation enforced)
- [ ] User blocked from admin & super pages
- [ ] Admin blocked from super pages
- [ ] Cross‑company data isolation holds
- [ ] Wrong password rejected

---

## Stage 5 — Cleanup (optional)

| Step | Action | Expected |
|------|--------|----------|
| 1 | As Super Admin → **Companies** → delete **Bright Labs** → confirm | Company and its users removed |

- [ ] Scenario data cleaned up (optional)

---

## End‑to‑end sign‑off
- [ ] Stage 1 (Super Admin) ✓
- [ ] Stage 2 (Company Admin) ✓
- [ ] Stage 3 (User, non‑AI) ✓
- [ ] Stage 4 (negative paths) ✓
- [ ] Defects logged

**Tester:** __________ **Build / commit:** __________ **Date:** __________
