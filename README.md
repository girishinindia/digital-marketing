# Digital Marketing — AI Social Media Suite

Multi-company, multi-user platform for generating social-media posts with AI. Built as a single
**Next.js 15** app (App Router) — frontend and API together, no separate backend service.

- **Database:** Supabase Postgres, all objects in the **`seo`** schema
- **Auth:** custom JWT (access + refresh) with Redis-backed sessions — *not* Supabase Auth
- **State / cache / OTP / rate-limit:** Upstash Redis
- **File storage:** Bunny Storage + CDN
- **AI:** provider-agnostic adapter for **OpenAI, Anthropic (Claude) and Google Gemini**
- **UI:** Tailwind CSS, light royal-blue theme

---

## Roles & capabilities

| | Super Admin | Company Admin | User |
|---|:---:|:---:|:---:|
| Manage companies | ✓ | | |
| Assign company admins | ✓ | | |
| Manage platforms / content types / post types | ✓ | | |
| Map post types ↔ content types | ✓ | | |
| Manage users in own company | | ✓ | |
| Activate / deactivate users **by date window** | | ✓ | |
| Assign post types & content types to users | | ✓ | |
| Generate AI posts (within granted types) | | ✓ | ✓ |

**Date-window activation:** every user has optional `active_from` / `active_to` dates. A user can sign
in only when their account is enabled **and** today falls inside the window. (The seeded user
`karan@growupmore.in` starts in 7 days — a live demo.)

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local      # then fill in values (a working .env.local is already provided)

# 3. Apply the database schema (schema: seo) — see migrations/README.md
npm run db:migrate              # or run migrations/0*.sql in order via Supabase SQL editor / psql

# 4. Run
npm run dev                     # http://localhost:3000
```

### Demo logins

| Role | Email | Password |
|------|-------|----------|
| Super Admin | girish@growupmore.in | SuperAdmin@123 |
| Company Admin | rahul@growupmore.in | Password@123 |
| User | priya@growupmore.in (also amit / neha / karan) | Password@123 |

> Change these before any real deployment.

### Enabling AI

Add a key for any provider in `.env.local` and set `AI_DEFAULT_PROVIDER`:

```
AI_DEFAULT_PROVIDER=openai      # openai | anthropic | gemini
OPENAI_API_KEY=...              # and/or ANTHROPIC_API_KEY / GEMINI_API_KEY
```

The AI Studio lets the user pick **Auto** (default provider) or a specific model per generation.
Until a key is added, generation returns a clear "no provider configured" message — everything else works.

---

## Project structure

```
migrations/                 Ordered SQL (schema seo) + run guide
scripts/migrate.mjs         Optional Node migration runner
middleware.ts               Edge auth + role-based route gating
src/
  app/
    (auth)/login            Login screen
    (dashboard)/            Authenticated shell + role pages
    api/                    Route handlers (auth, companies, admins, platforms,
                            content-types, post-types, mappings, users, grants,
                            ai, posts, media, dashboard, audit)
  components/ (ui, layout)  Reusable UI + app shell
  lib/                      env, db (pg pool), redis, bunny, recaptcha, jwt,
                            password, auth, rbac, validation (zod), audit, ai/*
  types/                    Shared types
```

## Security notes

- Passwords hashed with bcrypt; access token 15 min, refresh token 7 days (rotating, revocable via Redis + `seo.refresh_tokens`).
- Every mutating route is permission-checked (`src/lib/rbac.ts`) and company-scoped where relevant.
- Login is rate-limited; AI generation is rate-limited per user.
- reCAPTCHA Enterprise supported (off by default via `RECAPTCHA_ENABLED`).
- All inputs validated with zod; all privileged actions written to `seo.audit_logs`.
