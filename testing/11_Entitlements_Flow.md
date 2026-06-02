# 11 — Company Entitlements (3‑Tier Cascade)

Covers the new rule: **`user grants ⊆ company entitlement ⊆ global catalog`**.
- **Super Admin** grants a subset of the catalog **to a company** (its entitlement).
- **Company Admin** assigns to employees + the 🏢 company account, **only from within that entitlement**.

**Precondition:** apply migration **011**, then **restart `npm run dev`** (new API routes). Migration 011 backfills each company's entitlement = the union of grants its users already had, so nothing breaks.

Result key: ✅ Pass · ❌ Fail · ⏭️ Skipped

---

## Part 1 — Super Admin sets a company's entitlement

### TC‑ENT‑01 — Open the entitlement editor
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sign in as Super Admin → **Companies** | Each company row now has a **Grants** button |
| 2 | Click **Grants** on **GrowUpMore** | "Entitlement · GrowUpMore" editor opens, listing the **full catalog** grouped by platform; the items GrowUpMore already used are pre‑ticked (backfill) |
| 3 | Tick a new post type (e.g. a Reddit post type) → **Save** | Toast "Saved"; GrowUpMore is now entitled to it |
| 4 | Re‑open → expand a post type → adjust its **content types** → Save | Content‑format entitlement persists |

- [ ] Grants button per company
- [ ] Editor shows the full catalog (Super Admin chooses freely)
- [ ] Backfill pre‑ticked the company's existing items
- [ ] Save persists post types + content types

**Result:** ____

---

## Part 2 — Company Admin only sees the entitlement

### TC‑ENT‑02 — Team grant editor is limited to the entitlement
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | As Super Admin → **Companies → Grants** on a test company, entitle it to **only Instagram + X** → Save | Entitlement set |
| 2 | Open **Team** for that company (or sign in as its admin) → click a user's **grants** chip | The grant editor shows **only Instagram and X** — **not** the full catalog |
| 3 | Open the **🏢 Company** profile **Grants** | Same limited set (entitlement applies to the company account too) |

- [ ] User grant editor shows only the company's entitled platforms/post types
- [ ] Company‑account grant editor is limited the same way

**Result:** ____

### TC‑ENT‑03 — Content types are limited too
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | In a user's grant editor, check an entitled post type → expand **content types** | Only the **entitled** content formats for that post type appear (not every mapping) |

- [ ] Content‑type pills are limited to the entitlement

**Result:** ____

---

## Part 3 — Enforcement & Studio

### TC‑ENT‑04 — Server rejects out‑of‑entitlement grants
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | (DevTools) `POST /api/users/<id>/grants` with a `postTypeId` **not** in the company entitlement | Rejected: 403 "Some post types are not in this company's entitlement" |

- [ ] You cannot grant beyond the entitlement even via the API

**Result:** ____

### TC‑ENT‑05 — AI Studio compose limited to entitlement
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | As a Company Admin, open **AI Studio** | The Platform/Post‑type dropdowns show only the **company's entitled** items (not the whole catalog) |
| 2 | As Super Admin, **AI Studio** → pick a company | Options reflect **that company's** entitlement |

- [ ] Admin Studio compose is limited to the entitlement

**Result:** ____

---

## Part 4 — Shrinking an entitlement auto‑revokes grants

### TC‑ENT‑06 — Removing from entitlement cascades
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Confirm a user currently has, say, **Instagram Reel** granted | Shown in their grants |
| 2 | Super Admin → **Companies → Grants** → **un‑tick Instagram Reel** from the company entitlement → Save | Saved |
| 3 | Re‑open that user's grants | **Instagram Reel is gone** — it was auto‑revoked because the company is no longer entitled |
| 4 | The user's "N post types" count drops accordingly | Count reduced |

- [ ] Removing an entitlement removes it from every user/company‑account that had it

**Result:** ____

---

## Part 5 — Who can do what (recap)

| Role | Grants… | …to | limited by |
|------|---------|-----|------------|
| Super Admin | platforms · post types · content types | a **Company** | global catalog |
| Company Admin | post types · content types | employees + 🏢 company | that company's **entitlement** |
| User | — | — | their own grants |

- [ ] Cascade behaves as in the table

**Result:** ____

---

## Suite sign‑off
- [ ] Super Admin entitlement editor ✓
- [ ] Grant editors limited to entitlement (users + company account) ✓
- [ ] Server enforcement ✓
- [ ] Studio limited to entitlement ✓
- [ ] Auto‑revoke on shrink ✓

**Tester:** __________ **Date:** __________
