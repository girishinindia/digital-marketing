# 12 — Approval · Executor · Batch Flow

Covers the pipeline pivot:
- **Only Super Admin and Company Admin create posts.** Normal users no longer generate.
- **Company Admin (and Super Admin) approve** generated posts.
- **Normal users copy approved posts** and publish them to their own socials from **My Schedule**, then **mark posted** (→ `published` + timestamp).
- **Admins batch‑generate** one post per eligible entity for a date — no extra, no waste.

**Precondition:** apply migration **012** (`012_slot_dedupe.sql`), then **restart `npm run dev`** (new API routes: `/api/posts/[id]/approve`, `/api/posts/approve`, `/api/posts/[id]/mark-posted`, `/api/schedule`, `/api/batch-generate`).

Result key: ✅ Pass · ❌ Fail · ⏭️ Skipped

---

## Part 1 — Role pivot (who can do what)

### TC‑PIPE‑01 — Normal user can no longer create posts
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as a **User** (e.g. priya@growupmore.in) | Sidebar shows **My Schedule** — **no** "AI Studio", **no** "Posts" |
| 2 | Manually visit `/studio` | Redirected/blocked (route not allowed for users) |
| 3 | Manually visit `/posts` | Redirected/blocked |
| 4 | `POST /api/posts` or `/api/ai/generate` as the user (devtools) | **403** — users lack `posts.create` |

- [ ] User sees only My Schedule (no Studio/Posts in nav)
- [ ] `/studio` and `/posts` are blocked for users
- [ ] Post‑creation APIs return 403 for users

**Result:** ____

### TC‑PIPE‑02 — Admins keep full authoring
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as **Company Admin** | Sidebar shows **Calendar**, **AI Studio**, **Posts** |
| 2 | Sign in as **Super Admin** | Sees **every** menu item (100% access), incl. Calendar/Studio/Posts with a company selector |

- [ ] Company Admin retains Studio + Posts + Calendar
- [ ] Super Admin retains all menus and company selectors

**Result:** ____

---

## Part 2 — Batch generate (no waste)

### TC‑PIPE‑03 — Batch creates one post per eligible entity
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | As Admin → **Calendar** → click **⚡ Batch** | "Batch generate" modal opens, loading the company's **entitled** options |
| 2 | Pick a **date**, a **platform**, a **post type** that several entities are granted, leave content types empty → **Generate for everyone** | Toast "Created N · skipped 0 …"; result line shows **eligible = N**, **created = N** |
| 3 | Re‑open Calendar for that week | Each eligible entity (employees **+ 🏢 company account**) has one slot on that date, status **generated** |
| 4 | Open **Posts** | N new posts in **generated** status, authored per entity, each with `scheduled_at` = chosen date/time |

- [ ] Modal shows only entitled platforms/post types
- [ ] One post per eligible entity (incl. company account) — none for ungranted members
- [ ] Slots + posts carry the chosen date (and time if set)

**Result:** ____

### TC‑PIPE‑04 — Idempotency: re‑running wastes nothing
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Click **⚡ Batch** again with the **same** date + post type → Generate | Toast shows **created 0 · skipped N**; result line confirms skipped = N |
| 2 | Confirm in Posts | **No duplicate** posts were created |
| 3 | (DB) Inspect `seo.calendar_slots` | Only one row per (calendar, entity, platform, post type, content type, day) — enforced by `uq_slot_dedupe` |

- [ ] Second run regenerates nothing (created 0)
- [ ] No duplicate posts/slots
- [ ] Unique guard present

**Result:** ____

### TC‑PIPE‑05 — Multiple content types fan out per entity
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Batch with a post type that has mapped content types; tick **two** content types → Generate | created = eligible × 2; each entity gets one post **per** selected content type |
| 2 | Tick a content type **not** entitled (via crafted request) | Server keeps only entitled ones; fully out‑of‑entitlement selection → **400** |

- [ ] Content‑type selection multiplies correctly
- [ ] Non‑entitled content types are filtered/rejected

**Result:** ____

---

## Part 3 — Approval

### TC‑PIPE‑06 — Single approve
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | As Admin → **Posts** | A **"N awaiting approval"** bar appears; each **generated** post shows a green **✓ Approve** |
| 2 | Click **✓ Approve** on one post | Toast "Approved"; status badge flips **generated → approved** |
| 3 | Filter status = **approved** | The post is listed |

- [ ] Approve button only on generated posts
- [ ] Approving sets status = approved

**Result:** ____

### TC‑PIPE‑07 — Bulk approve
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Tick the header **select‑all** checkbox | All generated posts selected; bar shows "K selected" |
| 2 | Click **✓ Approve selected** | Toast "Approved K"; all flip to approved; selection clears |
| 3 | As Super Admin on another company | Bulk approve is **scoped** — only that company's posts change |

- [ ] Select‑all selects only pending (generated) posts
- [ ] Bulk approve updates all selected
- [ ] Scope respected (no cross‑company approval)

**Result:** ____

---

## Part 4 — Executor (My Schedule)

### TC‑PIPE‑08 — User sees only approved posts
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as a **User** with approved posts → **My Schedule** | Posts grouped by **day**, each a card with platform, post type, time, status |
| 2 | Confirm a still‑**generated** (unapproved) post is **not** shown | Users never see unapproved content |
| 3 | Cards show **Copy text + #**, **Copy text**, **Copy #**, **⬇ Media** (if any) | Buttons present |

- [ ] Only approved/scheduled/published posts appear
- [ ] Unapproved posts are hidden from users
- [ ] Copy/download controls present

**Result:** ____

### TC‑PIPE‑09 — Copy and mark posted
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Click **Copy text + #** | Clipboard holds body + hashtags; toast "Post copied" |
| 2 | Click **✓ Mark posted** | Toast "Marked as posted"; card flips to **posted** with a date; the button is replaced by a "posted" badge |
| 3 | (DB) Inspect the post | `status = 'published'`, `published_at` set to now() |
| 4 | Try to mark another user's post via crafted request | **404** (scope: a user can only mark **their own**) |

- [ ] Copy puts content on the clipboard
- [ ] Mark posted → published + timestamp
- [ ] A user can only mark their own posts

**Result:** ____

### TC‑PIPE‑10 — Dashboard reflects the executor model
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | As User → **Dashboard** | Cards read **My posts · To publish · Posted · Granted post types**; "Up next on your schedule" lists upcoming items; CTA = **Open My Schedule** |

- [ ] User dashboard is executor‑oriented (no "Generate a post")

**Result:** ____

---

## Part 5 — Access control (negative)

### TC‑PIPE‑11 — API guards
| Endpoint | As User | As Company Admin | As Super Admin |
|----------|---------|------------------|----------------|
| `POST /api/batch-generate` | 403 | ✅ own company | ✅ any (companyId) |
| `POST /api/posts/{id}/approve` | 403 | ✅ own company only | ✅ any |
| `POST /api/posts/approve` (bulk) | 403 | ✅ scoped | ✅ |
| `POST /api/posts/{id}/mark-posted` | ✅ own posts only | ✅ company | ✅ |
| `GET /api/schedule` | ✅ own | ✅ company | ✅ (companyId) |

- [ ] Each row behaves as listed (cross‑company access denied)

**Result:** ____

---

## Sign‑off
| Area | Pass/Fail | Notes |
|------|-----------|-------|
| Role pivot (no user authoring) | | |
| Batch generate + idempotency | | |
| Approval (single + bulk) | | |
| Executor (copy + mark posted) | | |
| API access guards | | |
