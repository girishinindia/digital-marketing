# 08 — Content Library Flow

**Goal:** verify per-company content **categories** and **ideas (details)**, who can manage them, company isolation, and the AI Studio idea-picker (prompt prefill + tagging — **without running an AI generation**).
**Precondition:** migrations **007** and **008** applied. `008` seeds GrowUpMore with 11 categories and ~75 ideas.

Result key: ✅ Pass · ❌ Fail · ⏭️ Skipped

---

## Part 1 — Company Admin manages the library

### TC‑CL‑01 — Seeded content is present
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as `rahul@growupmore.in` / `Password@123` | Sidebar now shows **Content Library** |
| 2 | Open **Content Library** | Left pane lists 11 categories (Promotions & Offers, Educational Tips, …); header shows ~75 ideas |
| 3 | Click **Educational Tips** | Right pane lists its ideas (Quick coding tips, Cheat sheets, …) each with a **suggested format** badge (Short Video, Carousel, …) |
| 4 | Click **All ideas** | Right pane shows every idea across categories |

- [ ] 11 categories seeded
- [ ] Ideas listed with suggested formats
- [ ] Category filter works

**Result:** ____

### TC‑CL‑02 — Create / edit / delete a category
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | **+ Category** → name `Webinars Special` → Save | Appears in the left pane (slug auto‑filled), 0 ideas |
| 2 | Hover it → ✎ → change name → Save | Name updates |
| 3 | Toggle its active state (the row reflects active/inactive) | Inactive shows struck‑through |
| 4 | Hover it → 🗑 → confirm | Removed |

- [ ] Category create / edit / toggle / delete all work

**Result:** ____

### TC‑CL‑03 — Create / edit / delete an idea
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | **+ Idea** → Category `Engagement & Community`, Title `Friday tech trivia`, Suggested format `Poll`, add a default prompt → Save | Idea appears under the category; category count +1 |
| 2 | **Edit** it → change the suggested format to `Image` → Save | Format badge updates |
| 3 | Toggle **off** | Shows **off** badge |
| 4 | **Del** → confirm | Removed; count −1 |

- [ ] Idea create / edit / toggle / delete all work
- [ ] Suggested format saved and shown

**Result:** ____

---

## Part 2 — Company isolation

### TC‑CL‑04 — Admin sees only their company's library
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | As Rahul (GrowUpMore), note the categories | They are GrowUpMore's |
| 2 | (If you created Acme Digital earlier) sign in as `anita@acme.test` → Content Library | Acme has **no** GrowUpMore categories (separate library); add a couple to confirm independence |

- [ ] Each company's library is isolated

**Result:** ____

---

## Part 3 — Super Admin access (all companies)

### TC‑CL‑05 — Company selector
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as `girish@growupmore.in` (Super Admin) → **Content Library** | A **Company** dropdown appears at the top |
| 2 | Select **GrowUpMore** | Shows GrowUpMore's 11 categories + ideas |
| 3 | Add a category while GrowUpMore is selected | It's created under GrowUpMore |
| 4 | Switch to another company (if one exists) | Library swaps to that company's |

- [ ] Super Admin can pick a company and manage its library

**Result:** ____

---

## Part 4 — AI Studio idea-picker (no generation)

### TC‑CL‑06 — Picking an idea prefills the prompt & format
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as a user with grants (e.g. `priya@growupmore.in`) → **AI Studio** | Composer loads |
| 2 | In **Start from a content idea**, choose a Category, then an Idea | The **Prompt** field auto‑fills with that idea's default prompt; if the idea's suggested format is available for the chosen post type, **Content type** switches to it |
| 3 | Change the Category | Idea dropdown resets; pick another idea → prompt updates |
| 4 | **Do not click Generate** | (AI generation remains out of scope) |

- [ ] Selecting an idea prefills the prompt
- [ ] Compatible suggested format is auto‑selected
- [ ] No AI call required to verify this

**Result:** ____

> The category/idea **tagging** of a saved post is verified only when a post is created (which goes through generation/Save). If you seed a post via the non‑AI helper (`01_Test_Data.md` §E) you can pass `contentCategoryId`/`contentDetailId` to see the tag on the Posts screen.

---

## Part 5 — Posts tagging

### TC‑CL‑07 — Category / idea tag on posts
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open **Posts** with any post that was saved from a content idea | The post card shows a royal **category** badge and a `💡 idea title` tag |

- [ ] Posts display their content category / idea tag (when set)

**Result:** ____

---

## Suite sign‑off
- [ ] Library CRUD (categories + ideas) ✓
- [ ] Company isolation ✓
- [ ] Super Admin company selector ✓
- [ ] Studio idea‑picker prefill ✓
- [ ] Posts tagging ✓
- [ ] Defects logged

**Tester:** __________ **Date:** __________
