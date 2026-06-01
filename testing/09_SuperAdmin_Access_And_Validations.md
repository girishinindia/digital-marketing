# 09 — Super Admin Full Access & UI Validations

Covers the latest changes: **Super Admin has 100% access** (every menu, page and operation, acting on any company via a company selector), plus the cross‑cutting **form validations** (lowercase email, 10‑digit mobile, password show/hide).

**Precondition:** **restart the dev server** first (`Ctrl+C` → `npm run dev`) — route‑protection middleware registers only at startup. Sign in as `girish@growupmore.in` / `SuperAdmin@123`.

Result key: ✅ Pass · ❌ Fail · ⏭️ Skipped

---

## Part 1 — Super Admin sees every menu

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as Super Admin | Sidebar shows **all** items: Dashboard, Companies, Company Admins, Platforms, Content Types, Post Types, **Team**, **Content Library**, **AI Studio**, **Posts** |

- [ ] All 10 menu items visible to Super Admin

**Result:** ____

---

## Part 2 — Super Admin can open every page (no redirects)

Type each URL directly in the address bar while signed in as Super Admin.

| URL | Expected |
|-----|----------|
| `/companies`, `/admins`, `/platforms`, `/content-types`, `/post-types` | Open (super‑admin pages) |
| `/users` (Team) | **Opens** — with a **Company** dropdown at the top |
| `/content-library` | **Opens** — with a Company dropdown |
| `/studio` (AI Studio) | **Opens** — with a Company dropdown |
| `/posts` | **Opens** — with a Company dropdown |

- [ ] Super Admin is **never redirected** away from any page
- [ ] Company‑scoped pages (Team, Content Library, Studio, Posts) show a company selector

**Result:** ____

---

## Part 3 — Super Admin operations on any company

### TC‑SAA‑01 — Team (users) for a chosen company
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open **Team** → in the **Company** dropdown pick `GrowUpMore` | Lists GrowUpMore's users (Priya, Amit, Neha, Karan) |
| 2 | Switch the dropdown to another company | The user list swaps to that company |
| 3 | **+ Add user** (with a company selected) → create a user | User is created **in the selected company** |
| 4 | **Edit** a user → change name / mobile / reset password → **Save** | Saves |
| 5 | Open a user's **grants** chip → assign post types → **Save grants** | Grants saved |
| 6 | **Remove** a throwaway user | Removed |

- [ ] Super Admin can list/create/edit/delete/grant users for **any** company

**Result:** ____

### TC‑SAA‑02 — Posts for a chosen company
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open **Posts** → pick a company | Shows that company's posts (or empty state) |
| 2 | Edit / change status / delete a post | Works for that company's post |

- [ ] Super Admin can view & manage any company's posts

**Result:** ____

### TC‑SAA‑03 — AI Studio for a chosen company
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open **AI Studio** → pick `GrowUpMore` | Platform/post‑type dropdowns list the full catalog; the **content‑idea** picker loads GrowUpMore's categories & ideas |
| 2 | Switch company | The content‑idea picker reloads with that company's library |
| 3 | (AI generation itself is out of scope) | — |

- [ ] Studio loads the selected company's content library
- [ ] Saving a post would land in the selected company (verify the company on the Posts screen if you have an AI key)

**Result:** ____

---

## Part 4 — Form validations (all roles)

### TC‑SAA‑04 — Email is lowercase everywhere
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | **Login** screen → type `Girish@GROWUPMORE.IN` | Field shows `girish@growupmore.in` (auto‑lowercased) |
| 2 | **New admin** / **Add user** → type a mixed‑case email | Auto‑lowercases as you type |

- [ ] Email auto‑lowercases on login, new admin, and add user

**Result:** ____

### TC‑SAA‑05 — Password show/hide (eye)
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | On **Login**, click the eye in the password box | Password text toggles visible/hidden |
| 2 | Same in **New/Edit admin** and **Add/Edit user** password fields | Toggle works in every password field |

- [ ] Eye toggle present and working on all password inputs

**Result:** ____

### TC‑SAA‑06 — Mobile is exactly 10 digits
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | In any **Mobile** field, type letters/symbols | Ignored — digits only |
| 2 | Enter fewer than 10 digits | **Save** stays disabled |
| 3 | Enter exactly 10 digits | Accepted |

- [ ] Mobile accepts only digits, requires exactly 10 (admin & user, add & edit)

**Result:** ____

### TC‑SAA‑07 — Content Library create works (regression)
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | As Super Admin → **Content Library** → pick a company → **+ Category** → fill & Save | Category is created (no "Validation failed") |
| 2 | **+ Idea** under it → Save | Idea created |

- [ ] Category & idea creation succeed (the BIGINT‑id validation bug is fixed)

**Result:** ____

---

## Part 5 — Other roles stay restricted (cross‑check)

| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as a **User** → type `/companies`, `/users`, `/content-library` | All redirect to `/dashboard` |
| 2 | Sign in as a **Company Admin** → type `/companies`, `/admins`, `/platforms` | All redirect to `/dashboard` |

- [ ] Only Super Admin has full access; User & Company Admin remain gated (see doc 02)

**Result:** ____

---

## Suite sign‑off
- [ ] Super Admin: all menus + all pages ✓
- [ ] Super Admin operations on any company (Team / Posts / Studio) ✓
- [ ] Email lowercase · password eye · 10‑digit mobile ✓
- [ ] Content Library create fixed ✓
- [ ] Other roles still restricted ✓

**Tester:** __________ **Date:** __________
