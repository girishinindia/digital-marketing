# 10 — Company Account & Weekly Calendar

Covers: the **company as its own posting entity** (with its own broad platforms), per‑entity grants, and the **weekly content calendar** (plan slots per entity/day, then generate).

**Precondition:** apply migrations **009** + **010**, then **restart `npm run dev`** (new sidebar route + middleware). Sign in as Company Admin (`rahul@growupmore.in`) or Super Admin (uses a company selector).

> **AI note:** actually *generating* a slot needs an AI key in `.env.local`. Planning, slots, grants and the calendar grid all work **without** a key — the **Generate** buttons will return "No AI provider configured" until a key is added. Treat generation steps as optional.

Result key: ✅ Pass · ❌ Fail · ⏭️ Skipped

---

## Part 1 — The company is a posting entity

### TC‑CAL‑01 — Company profile + broad grants
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as Rahul → **Team** | A pinned **🏢 GrowUpMore (Company)** card appears above the employees table |
| 2 | The employees table | Lists employees only (Priya, Amit, Neha, Karan) — the company account is **not** in the list |
| 3 | On the company card click **Grants** | The grants editor opens showing the company's **broad** post types ticked: YouTube, Facebook Page & Group, Telegram Channel, WhatsApp Channel, LinkedIn, etc. |
| 4 | Close, then open an **employee's** grants (e.g. Priya) | A **different, limited** set (her seeded grants) — e.g. no YouTube |

- [ ] Company profile pinned; not mixed into employees
- [ ] Company has broad/official grants; employees have limited grants

**Result:** ____

---

## Part 2 — Weekly calendar grid

### TC‑CAL‑02 — Open the calendar
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sidebar → **Calendar** | Grid loads: **rows = company + employees**, **columns = Mon–Sun** of the current week |
| 2 | Use **← Prev / Next → / This week** | The week (and the date under each day header) changes |
| 3 | (Super Admin only) pick a company | Grid swaps to that company's entities |

- [ ] Calendar grid shows entities × days
- [ ] Week navigation works

**Result:** ____

### TC‑CAL‑03 — Add a slot for the COMPANY (broad platforms)
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | On the **🏢 Company** row, a weekday cell → **+ add** | Slot dialog opens for the company |
| 2 | Open the **Platform** dropdown | Shows the company's granted platforms incl. **YouTube / Telegram / WhatsApp / LinkedIn** |
| 3 | Pick YouTube → Post type → (optional content type) → optional **Content idea** → set a time → **Save** | Toast; a slot chip appears in that cell with status **planned** |

- [ ] Company slot can use YouTube/channel/page platforms

**Result:** ____

### TC‑CAL‑04 — Add a slot for an EMPLOYEE (limited platforms)
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | On an **employee** row → a cell → **+ add** | Slot dialog for that employee |
| 2 | Open the **Platform** dropdown | Shows **only** the employee's granted platforms — **YouTube is absent** (it's a company channel) |
| 3 | Pick one → Save | Slot chip appears |

- [ ] Employee slot is limited to their granted platforms (no company‑only channels)

**Result:** ____

### TC‑CAL‑05 — Edit / delete a slot
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Click an existing slot chip | Edit dialog opens with its values |
| 2 | Change the time / notes → **Save** | Updated |
| 3 | Open a slot → **Delete** → confirm | Removed from the grid |

- [ ] Slot edit and delete work

**Result:** ____

### TC‑CAL‑06 — Guard: entity must be granted the post type
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | For an entity with no grants (if any), open **+ add** | Message: "This entity has no granted platforms. Set its grants in Team first." |

- [ ] You can't plan a slot on a platform the entity isn't granted

**Result:** ____

---

## Part 3 — Generation (needs an AI key)

### TC‑CAL‑07 — Generate a single slot
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open a planned slot → **✨ Generate** | With an AI key: slot status → **generated**, a draft post is created and linked ("View the generated post in Posts →"). Without a key: clear "No AI provider configured" message |

- [ ] Per‑slot generate creates a linked draft (or reports missing key)

**Result:** ____ (⏭️ if no AI key)

### TC‑CAL‑08 — Generate the whole week
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Click **✨ Generate week** → confirm | Toast reports counts: "Generated N · M failed"; planned slots flip to **generated** |
| 2 | Open **Posts** | The generated posts appear, attributed to the right entity (company or employee) and tagged with the content idea |

- [ ] Whole‑week generate processes all planned slots
- [ ] Generated posts land in Posts for the correct entity

**Result:** ____ (⏭️ if no AI key)

---

## Part 4 — Access

### TC‑CAL‑09 — Who can open the Calendar
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | As a **User** (Priya), type `/calendar` | Redirected to `/dashboard` (calendar is admin‑only) |
| 2 | As **Company Admin** / **Super Admin** | Calendar opens |

- [ ] Calendar is restricted to Company Admin + Super Admin

**Result:** ____

---

## Suite sign‑off
- [ ] Company account exists with broad grants; employees limited ✓
- [ ] Calendar grid + week navigation ✓
- [ ] Slots respect each entity's grants ✓
- [ ] Slot edit/delete ✓
- [ ] Generation (per‑slot + week) ✓ / ⏭️ (AI key)
- [ ] Access restricted correctly ✓

**Tester:** __________ **Date:** __________
