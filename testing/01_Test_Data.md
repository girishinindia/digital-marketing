# Test Data Sheet (sample, non‑SQL)

All values below are entered **through the UI** during testing. Dates are written **relative to the day you test** (e.g., "today + 5") because activation behaviour depends on the current date. Use real calendar dates in the date pickers (format `YYYY‑MM‑DD`).

---

## A. Already seeded by the migrations

### A1. Company
| Name | Slug | Status |
|------|------|--------|
| GrowUpMore | `growupmore` | Active |

### A2. Super Admin (global)
| Name | Email | Password |
|------|-------|----------|
| Girish Patel | `girish@growupmore.in` | `SuperAdmin@123` |

### A3. Company Admin (GrowUpMore)
| Name | Email | Password |
|------|-------|----------|
| Rahul Sharma | `rahul@growupmore.in` | `Password@123` |

### A4. Users (GrowUpMore) — note the activation windows
| Name | Email | Password | Activation window | Effective today? |
|------|-------|----------|-------------------|------------------|
| Priya Mehta | `priya@growupmore.in` | `Password@123` | none (always) | ✅ Active |
| Amit Desai | `amit@growupmore.in` | `Password@123` | today‑30 → today+60 | ✅ Active |
| Neha Joshi | `neha@growupmore.in` | `Password@123` | today‑5 → none | ✅ Active |
| Karan Shah | `karan@growupmore.in` | `Password@123` | **today+7** → today+37 | ❌ Not yet active |

### A5. Catalog (counts)
- **12 platforms:** Facebook, Instagram, X, LinkedIn, YouTube, Pinterest, WhatsApp, TikTok, Snapchat, Reddit, Threads, Telegram
- **13 content types:** Text, Image, Image + Text, Video, Short Video, Live Video, Carousel, Link, Poll, Audio / Voice Note, GIF, Document / PDF, Event
- **~60 post types** (per platform) and **~160 post‑type ↔ content‑type mappings**

Sample post types you'll reference:

| Platform | Example post types |
|----------|--------------------|
| Facebook | Feed Post, Story, Reel, Live, Event, Group Post, Page Post |
| Instagram | Feed Post, Story, Reel, Carousel, Live, Guide |
| X | Tweet, Thread, Reply, Quote Tweet, Space |
| LinkedIn | Post, Article, Video, Document Post, Poll, Newsletter, Event |

---

## B. New data you will CREATE during testing

### B1. Companies (created by Super Admin — doc 03)
| Name | Slug | Legal name | Website | Active |
|------|------|-----------|---------|--------|
| Acme Digital | `acme-digital` | Acme Digital Pvt Ltd | `https://acme.test` | Yes |
| Nova Media | `nova-media` | Nova Media LLP | `https://nova.test` | Yes |

### B2. Company Admins (created by Super Admin — doc 03)
| Name | Email | Temp password | Company |
|------|-------|---------------|---------|
| Anita Rao | `anita@acme.test` | `Acme@12345` | Acme Digital |
| Vikram Iyer | `vikram@nova.test` | `Nova@12345` | Nova Media |

### B3. Users (created by Anita, admin of Acme Digital — doc 04)
| Name | Email | Temp password | Active from | Active to | Enabled | Expected effective status |
|------|-------|---------------|-------------|-----------|---------|---------------------------|
| Sara Khan | `sara@acme.test` | `User@12345` | (blank) | (blank) | Yes | ✅ Active now |
| Tom Lee | `tom@acme.test` | `User@12345` | today + 5 | today + 30 | Yes | ❌ Not yet active |
| Mia Wong | `mia@acme.test` | `User@12345` | today ‑ 30 | **yesterday** | Yes | ❌ Expired |
| Leo Das | `leo@acme.test` | `User@12345` | (blank) | (blank) | **No** (disabled) | ❌ Disabled |

### B4. Sample grants (assigned by Anita to Sara — doc 04)
| User | Platform | Post types to grant | Content types |
|------|----------|--------------------|---------------|
| Sara Khan | Instagram | Feed Post, Story, Reel | leave all (default) |
| Sara Khan | X | Tweet, Thread | Tweet → keep only **Text** + **Image** |

---

## C. Master credentials table

| # | Role | Email | Password | Source |
|---|------|-------|----------|--------|
| 1 | Super Admin | `girish@growupmore.in` | `SuperAdmin@123` | seeded |
| 2 | Company Admin (GrowUpMore) | `rahul@growupmore.in` | `Password@123` | seeded |
| 3 | User (active) | `priya@growupmore.in` | `Password@123` | seeded |
| 4 | User (active) | `amit@growupmore.in` | `Password@123` | seeded |
| 5 | User (active) | `neha@growupmore.in` | `Password@123` | seeded |
| 6 | User (scheduled) | `karan@growupmore.in` | `Password@123` | seeded |
| 7 | Company Admin (Acme) | `anita@acme.test` | `Acme@12345` | you create |
| 8 | Company Admin (Nova) | `vikram@nova.test` | `Nova@12345` | you create |
| 9 | User (active) | `sara@acme.test` | `User@12345` | you create |
| 10 | User (scheduled) | `tom@acme.test` | `User@12345` | you create |
| 11 | User (expired) | `mia@acme.test` | `User@12345` | you create |
| 12 | User (disabled) | `leo@acme.test` | `User@12345` | you create |

---

## D. Date‑window activation matrix (expected login behaviour)

| Case | Example account | is_active | active_from | active_to | Login result |
|------|-----------------|-----------|-------------|-----------|--------------|
| Always active | Priya / Sara | on | — | — | ✅ Logs in |
| Inside window | Amit | on | past | future | ✅ Logs in |
| Open‑ended start | Neha | on | past | — | ✅ Logs in |
| **Scheduled (future start)** | Karan / Tom | on | future | future | ❌ "Your access is not active for today's date." |
| **Expired (past end)** | Mia | on | past | past | ❌ "Your access is not active for today's date." |
| **Disabled** | Leo | off | — | — | ❌ "Your account has been deactivated." |
| Wrong password | any | — | — | — | ❌ "Invalid email or password." |

---

## E. Optional setup helper — seed a sample Post WITHOUT AI

In the current build the only UI path to create a post is the AI Studio. To exercise the **Posts** management screen (edit / status / schedule / delete) while AI is excluded, create one draft via the built‑in **non‑AI** endpoint. Log in as the user first, then paste this in the browser DevTools **Console** (it uses your logged‑in session, no AI involved):

```js
// Run while signed in as a user or company admin.
// platformId / postTypeId must be ones the account can use (see the AI Studio dropdowns).
await fetch('/api/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ platformId: 2, postTypeId: 8, title: 'Sample draft', body: 'Manual sample post for testing the Posts screen.' })
}).then(r => r.json()).then(console.log)
```

> Tip: open the **AI Studio** dropdowns to read the exact platform/post‑type IDs available to that account, or just use the IDs shown in the response. This is a **test setup helper only** — it is not part of the AI feature.
