# 05 — User Flow (non‑AI)

**Goal:** verify the employee experience — dashboard, granted‑type visibility in the AI Studio (without running a generation), and full Posts management.
**Precondition:** sign in as a user **who has grants**. Primary: `priya@growupmore.in` / `Password@123` (seeded video specialist). Alternative: `sara@acme.test` (set up in doc 04).

> **AI excluded:** we open the AI Studio to check access and dropdowns, but we do **not** click **✨ Generate**. Posts are created for testing with the non‑AI helper in `01_Test_Data.md` §E.

Result key: ✅ Pass · ❌ Fail · ⏭️ Skipped

---

## Part 1 — User dashboard

### TC‑U‑01 — Dashboard stats
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as Priya | Lands on `/dashboard` |
| 2 | Read the stat cards | **My posts**, **Drafts**, **Scheduled / published**, **Granted post types** (a non‑zero number) |
| 3 | Read **Recent posts** | Shows "No posts yet — head to the AI Studio." (or recent rows if posts exist) |
| 4 | Confirm sidebar | Only **Dashboard, AI Studio, Posts** are present |

- [ ] User dashboard renders with the four stat cards
- [ ] Granted post types count is > 0
- [ ] Sidebar shows only user‑level items

**Result:** ____

---

## Part 2 — AI Studio: access & granted‑type visibility (no generation)

### TC‑U‑02 — Only granted platforms & post types appear
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sidebar → **AI Studio** | Composer loads (Platform, Post type, Content type, AI model, Tone, Prompt) |
| 2 | Open the **Platform** dropdown | Lists **only** platforms Priya has grants on (e.g., YouTube, Instagram, TikTok…), not all 12 |
| 3 | Pick a platform, open **Post type** | Lists only Priya's granted post types for that platform (e.g., Instagram → Reel only, not Feed Post) |
| 4 | Open **Content type** | Lists the content formats allowed for that post type |
| 5 | **Do not click Generate** | (AI generation is out of scope for this pack) |

- [ ] Platform list is limited to granted platforms
- [ ] Post‑type list is limited to granted post types
- [ ] Content‑type list reflects the mapping/grant

**Result:** ____

### TC‑U‑03 — Ungranted types are not reachable
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Confirm a post type Priya was **not** granted (e.g., X → Tweet) | It does **not** appear in any dropdown |

- [ ] A user cannot select post types they were not granted

**Result:** ____

### TC‑U‑04 — User with no grants
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | (Optional) create/temporarily clear a user's grants, sign in, open AI Studio | Message: "You don't have any post types granted yet. Ask your company admin to assign some." |

- [ ] No‑grant user sees the empty‑state guidance

**Result:** ____ (⏭️ if not set up)

---

## Part 3 — Posts management (non‑AI)

### TC‑U‑05 — Empty state
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sidebar → **Posts** | "No posts yet. Generate one in the AI Studio." + a status filter dropdown |

- [ ] Posts screen shows the empty state

**Result:** ____

### TC‑U‑06 — Seed a sample draft (non‑AI helper)
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open DevTools **Console**, run: `await fetch('/api/ai/options').then(r=>r.json()).then(d=>console.table(d.data.postTypes))` | A table of the user's granted post types with their **id** and **platformId** |
| 2 | Pick one row; run the create snippet from `01_Test_Data.md` §E using those `platformId` / `postTypeId` | Console prints the created post `{ id, status: 'draft', … }` |
| 3 | Reload **Posts** | The **Sample draft** card appears with a **draft** badge, platform tag, author, timestamp |

- [ ] A draft can be created without AI and appears on the Posts screen

**Result:** ____

### TC‑U‑07 — Edit a post
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | On the draft, click **Edit** | Modal opens with Title, Body, Hashtags, Status, Media URL |
| 2 | Change **Body**, add **Hashtags** `#test #qa`, set **Status = approved** → **Save** | Toast "Post updated"; badge changes to **approved**; hashtags shown |

- [ ] Body / hashtags edit and save
- [ ] Status change reflects in the badge

**Result:** ____

### TC‑U‑08 — Schedule a post
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Edit the post → set **Status = scheduled** | A **Schedule at** date‑time field appears |
| 2 | Pick a future date‑time → **Save** | Badge becomes **scheduled**; card shows "scheduled <date/time>" |

- [ ] Selecting "scheduled" reveals the schedule field
- [ ] Scheduled time is saved and displayed

**Result:** ____

### TC‑U‑09 — Add a media URL (field‑level)
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Edit the post → paste any URL into **Media URL** (e.g., `https://cdn.growupmore.com/sample.jpg`) → **Save** | Saved without error |

> The Bunny **upload** widget lives in the AI Studio result panel (post‑generation) and is therefore out of scope here; this checks the Media URL field only.

- [ ] Media URL field accepts and stores a value

**Result:** ____

### TC‑U‑10 — Status filter
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | In the **status filter** dropdown, choose **scheduled** | Only scheduled posts listed |
| 2 | Choose **All statuses** | All posts listed again |

- [ ] Status filter narrows the list correctly

**Result:** ____

### TC‑U‑11 — Delete a post
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | On the post, click **Delete** → confirm | Toast; post removed; empty state returns if it was the last |

- [ ] Post can be deleted

**Result:** ____

---

## Part 4 — User restrictions (quick recheck)

### TC‑U‑12 — User cannot reach admin areas
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Type `/users`, `/companies`, `/platforms` in the address bar | Each redirects to `/dashboard` |
| 2 | Confirm a user can only see **their own** posts | The Posts list never shows other users' posts |

- [ ] User blocked from admin/super pages
- [ ] User sees only their own posts

**Result:** ____

---

## Suite sign‑off
- [ ] Dashboard ✓ · [ ] Studio visibility (no generation) ✓ · [ ] Posts CRUD/status/schedule ✓ · [ ] Restrictions ✓
- [ ] Defects logged

**Tester:** __________ **Date:** __________
