# 02 — Authentication & Access Control

**Goal:** verify login, logout, sessions, role‑based route protection, **date‑window activation**, and rate‑limiting.
**Preconditions:** app running at `http://localhost:3000`, migrations applied, you are signed out.

Result key: ✅ Pass · ❌ Fail · ⏭️ Skipped

---

## TC‑AUTH‑01 — Valid login for each role

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open `/login` | Login card shows email + password fields and a demo‑accounts hint |
| 2 | Sign in as `girish@growupmore.in` / `SuperAdmin@123` | Redirected to `/dashboard`; sidebar shows **Companies, Company Admins, Platforms, Content Types, Post Types** |
| 3 | Sign out, sign in as `rahul@growupmore.in` / `Password@123` | Dashboard shows admin stats; sidebar shows **Team, AI Studio, Posts** |
| 4 | Sign out, sign in as `priya@growupmore.in` / `Password@123` | Dashboard shows user stats; sidebar shows **AI Studio, Posts** only |

- [ ] Super Admin logs in and sees super‑admin nav
- [ ] Company Admin logs in and sees admin nav
- [ ] User logs in and sees user nav

**Result:** ____

---

## TC‑AUTH‑02 — Invalid credentials & validation

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | At `/login`, enter `girish@growupmore.in` / `WrongPass1` → Sign in | Red error: **"Invalid email or password"**; stays on login |
| 2 | Enter unknown `nobody@growupmore.in` / `Password@123` | Same generic **"Invalid email or password"** (no hint that the email is unknown) |
| 3 | Leave password blank → Sign in | Browser blocks submit (required field) / no request sent |
| 4 | Enter a malformed email `abc@` | Browser email validation blocks submit |

- [ ] Wrong password rejected with generic message
- [ ] Unknown email gives the **same** generic message (no user enumeration)
- [ ] Empty / malformed fields blocked client‑side

**Result:** ____

---

## TC‑AUTH‑03 — Date‑window activation: scheduled (future start)

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as `karan@growupmore.in` / `Password@123` | ❌ Blocked: **"Your access is not active for today's date. Contact your administrator."** |

> Karan is seeded with an activation window starting **7 days from now**, so he cannot log in yet.

- [ ] Scheduled (not‑yet‑active) user cannot log in, with the date message

**Result:** ____

---

## TC‑AUTH‑04 — Date‑window activation: disabled account (self‑contained)

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as `rahul@growupmore.in` (admin) → **Team** | Team list shows Priya/Amit/Neha/Karan |
| 2 | On **Priya**, click **disable** | Status flips to **inactive**; toast confirms |
| 3 | Sign out → sign in as `priya@growupmore.in` | ❌ Blocked: **"Your account has been deactivated. Contact your administrator."** |
| 4 | Sign back in as Rahul → **Team** → Priya → **enable** | Status returns to **active** |
| 5 | Sign in as Priya again | ✅ Logs in normally |

- [ ] Disabled user is blocked with the deactivated message
- [ ] Re‑enabling restores login

**Result:** ____

---

## TC‑AUTH‑05 — Logout clears the session

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Logged in as any role, click avatar (top‑right) → **Sign out** | Redirected to `/login` |
| 2 | Press the browser **Back** button | You are **not** shown a protected page; you land back on `/login` (middleware redirect) |
| 3 | Manually visit `/dashboard` | Redirected to `/login?next=/dashboard` |

- [ ] Sign out returns to login
- [ ] Protected pages are not reachable after logout (even via Back)

**Result:** ____

---

## TC‑AUTH‑06 — Session persists across navigation & refresh

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as Rahul | On dashboard |
| 2 | Navigate Team → Posts → Dashboard | No re‑login prompts |
| 3 | Hard‑refresh (Ctrl/Cmd‑R) on `/posts` | Still logged in; page reloads with content |

- [ ] Session survives navigation and full page refresh

**Result:** ____

---

## TC‑AUTH‑07 — Role‑based route protection (RBAC)

Type these URLs directly in the address bar **while signed in** as the stated role.

> ⚠️ Route protection is enforced by middleware, which **registers only at server startup**. If you changed code, restart `npm run dev` before running this test.

| Signed in as | Visit URL | Expected |
|--------------|-----------|----------|
| User (Priya) | `/companies` | Redirected to `/dashboard` |
| User (Priya) | `/platforms` | Redirected to `/dashboard` |
| User (Priya) | `/users` | Redirected to `/dashboard` |
| User (Priya) | `/content-library` | Redirected to `/dashboard` |
| User (Priya) | `/studio`, `/posts`, `/dashboard` | Allowed |
| Company Admin (Rahul) | `/companies` | Redirected to `/dashboard` |
| Company Admin (Rahul) | `/admins` | Redirected to `/dashboard` |
| Company Admin (Rahul) | `/post-types` | Redirected to `/dashboard` |
| Company Admin (Rahul) | `/users`, `/content-library`, `/studio`, `/posts` | Allowed |
| **Super Admin (Girish)** | **any page** — `/companies`, `/admins`, `/platforms`, `/content-types`, `/post-types`, `/users`, `/content-library`, `/studio`, `/posts` | **Allowed — full access** (company‑scoped pages show a company selector) |
| Signed out | `/dashboard` | Redirected to `/login?next=/dashboard` |

- [ ] User blocked from admin/super pages
- [ ] Company Admin blocked from super pages
- [ ] **Super Admin can reach every page** (full access — not redirected anywhere)
- [ ] Signed‑out user redirected to login with `next`

**Result:** ____

---

## TC‑AUTH‑08 — Login rate limit

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | At `/login`, submit a wrong password for the same email **11 times quickly** | After ~10 attempts within a minute: **"Too many attempts. Please wait a minute."** (HTTP 429) |
| 2 | Wait 60 seconds, try valid credentials | ✅ Logs in |

- [ ] Rapid repeated logins are throttled
- [ ] Throttle clears after the window

**Result:** ____

---

## TC‑AUTH‑09 — reCAPTCHA disabled

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Confirm `.env.local` has `RECAPTCHA_ENABLED=false` | — |
| 2 | Log in normally | No captcha challenge appears; login succeeds |

- [ ] Login works with reCAPTCHA disabled (no challenge shown)

**Result:** ____

---

## Suite sign‑off
- [ ] All TC‑AUTH cases executed
- [ ] Priya re‑enabled and login restored after TC‑AUTH‑04
- [ ] Defects logged

**Tester:** __________ **Date:** __________
