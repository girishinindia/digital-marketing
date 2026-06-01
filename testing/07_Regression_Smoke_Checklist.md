# 07 — Regression / Smoke Checklist

A fast one‑page pass to run after every build/deploy. Aim: ~10–15 minutes. AI generation excluded.
Mark each ✅/❌. If anything fails, run the matching full doc (02–06).

**Build / commit:** ____________  **Env:** ____________  **Tester:** ____________  **Date:** ____________

---

## Auth & access (doc 02)
- [ ] Super Admin logs in → sees Companies/Admins/Platforms/Content Types/Post Types
- [ ] Company Admin logs in → sees Team/AI Studio/Posts
- [ ] User logs in → sees AI Studio/Posts only
- [ ] Wrong password → "Invalid email or password"
- [ ] `karan@growupmore.in` (scheduled) → blocked with date message
- [ ] Sign out → `/dashboard` redirects to `/login`
- [ ] User visiting `/companies` → redirected to `/dashboard`

## Super Admin (doc 03)
- [ ] Create + edit a company; toggle active; delete a throwaway
- [ ] Create a company admin against a company; **Edit** admin (name/mobile/reset password); disable works
- [ ] Platforms list shows 12; create/toggle/delete a test platform
- [ ] Content Types list shows 13; create/edit/delete works
- [ ] Post Types: switch platform; create a post type; manage content mappings (count updates)

## Super Admin full access & validations (doc 09)
- [ ] Super Admin sidebar shows **all** items; no page redirects them away
- [ ] Team / Posts / AI Studio show a **Company** selector and operate on the chosen company
- [ ] Content Library: create category + idea works (no "Validation failed")
- [ ] Email auto‑lowercases (login, new admin, add user); password **eye** toggles; mobile = exactly 10 digits

## Company Admin (doc 04)
- [ ] Create a user with **Active from / Active to** dates
- [ ] Future‑start user shows inactive; editing date to today activates them
- [ ] Set Active to = yesterday → user blocked at login; clear it → restored
- [ ] Enable/disable toggle enforced at login
- [ ] Grants: assign post types (count updates) and narrow content types; persists on reopen
- [ ] Team shows only this company's users

## User (doc 05, non‑AI)
- [ ] Dashboard stat cards render; granted post types > 0
- [ ] AI Studio shows only granted platforms/post types (no generation run)
- [ ] Create a draft via the non‑AI helper → appears on Posts
- [ ] Edit post (body/hashtags), change status, schedule with date‑time
- [ ] Status filter works; delete a post

## End‑to‑end & isolation (doc 06)
- [ ] Full chain Super Admin → Admin → User → manage post works
- [ ] Disabled user blocked; future‑dated user blocked
- [ ] Cross‑company isolation holds (admin can't see other companies' users)

---

### Result
- [ ] **PASS** — safe to proceed
- [ ] **FAIL** — blocking issues found (list below)

**Notes / defects:**

| # | Area | Summary | Severity |
|---|------|---------|----------|
| 1 | | | |
| 2 | | | |
| 3 | | | |
