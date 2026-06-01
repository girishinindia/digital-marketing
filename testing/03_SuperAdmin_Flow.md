# 03 — Super Admin Flow

**Goal:** verify every Super Admin capability — companies, company admins, and the global catalog (platforms, content types, post types, mappings).
**Precondition:** signed in as `girish@growupmore.in` / `SuperAdmin@123`.
**Data:** see `01_Test_Data.md` sections B1–B2.

Result key: ✅ Pass · ❌ Fail · ⏭️ Skipped

---

## Part 1 — Companies

### TC‑SA‑01 — Create companies
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sidebar → **Companies** | Table lists **GrowUpMore** (1 row) |
| 2 | Click **+ New company** | Modal opens with Name, Slug, Legal name, Website, Active toggle |
| 3 | Type name `Acme Digital` | **Slug** auto‑fills to `acme-digital` |
| 4 | Add legal `Acme Digital Pvt Ltd`, website `https://acme.test`, keep Active on → **Save** | Toast "Company created"; modal closes; **Acme Digital** appears with 0 users, **active** |
| 5 | Repeat for `Nova Media` (`https://nova.test`) | **Nova Media** row added |

- [ ] Slug auto‑generates from the name
- [ ] Both companies appear with 0 users and active status

**Result:** ____

### TC‑SA‑02 — Edit a company
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | On **Acme Digital**, click **Edit** | Modal pre‑filled with current values |
| 2 | Change website to `https://acme-digital.test` → **Save** | Toast "Company updated"; row reflects new link |

- [ ] Edit saves and reflects immediately

**Result:** ____

### TC‑SA‑03 — Activate / deactivate
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Click the green **active** badge on Nova Media | Badge turns grey **inactive** |
| 2 | Click it again | Returns to **active** |

- [ ] Status toggles by clicking the badge

**Result:** ____

### TC‑SA‑04 — Validation: duplicate slug
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | **+ New company** → name `Acme Digital`, slug `acme-digital` → **Save** | Error toast (duplicate slug rejected); no second row created |

- [ ] Duplicate slug is rejected

**Result:** ____

### TC‑SA‑05 — Delete a company (cascade)
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Create a throwaway company `Delete Me Co` (`delete-me-co`) | Row added |
| 2 | Click **Delete** on it → confirm the warning | Toast "Company deleted"; row removed |

> Deleting a company cascades its users and posts — only delete throwaways.

- [ ] Delete asks for confirmation and removes the company

**Result:** ____

---

## Part 2 — Company Admins

### TC‑SA‑06 — Create admins for companies
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sidebar → **Company Admins** | List shows existing **Rahul Sharma → GrowUpMore** |
| 2 | **+ New admin** → select **Acme Digital**, name `Anita Rao`, email `anita@acme.test`, password `Acme@12345` → **Create admin** | Toast; Anita appears mapped to **Acme Digital**, active |
| 3 | **+ New admin** → **Nova Media**, `Vikram Iyer`, `vikram@nova.test`, `Nova@12345` | Vikram appears mapped to **Nova Media** |

- [ ] Admin is created and shown against the correct company

**Result:** ____

### TC‑SA‑07 — Admin validation
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | **+ New admin**, leave **Company** unselected | **Create admin** button stays disabled |
| 2 | Enter a 5‑char password | Button stays disabled (needs ≥ 8 chars) |

- [ ] Company is required
- [ ] Password under 8 chars blocks submit

**Result:** ____

### TC‑SA‑08 — Disable / remove admin
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Toggle **Vikram** to inactive (status badge) | Badge → inactive |
| 2 | (optional) Sign in as `vikram@nova.test` in incognito | Blocked — deactivated message |
| 3 | Back as Super Admin, **Remove** a throwaway admin you create | Confirmation, then removed |

- [ ] Admin can be disabled (and is then blocked from login)
- [ ] Admin can be removed

**Result:** ____

---

## Part 3 — Platforms

### TC‑SA‑09 — View & create platform
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sidebar → **Platforms** | Card grid with 12 platforms; each shows its post‑type count |
| 2 | **+ New platform** → name `Mastodon` (slug auto `mastodon`) → **Save** | Toast; new **Mastodon** card with 0 post types |

- [ ] 12 seeded platforms shown with counts
- [ ] New platform created

**Result:** ____

### TC‑SA‑10 — Toggle, edit, delete platform
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Toggle Mastodon's switch off | Card shows **off** badge |
| 2 | **Edit** Mastodon → change name to `Mastodon Social` → **Save** | Name updates |
| 3 | **Del** Mastodon → confirm | Card removed |

- [ ] Toggle / edit / delete all work

**Result:** ____

---

## Part 4 — Content Types

### TC‑SA‑11 — CRUD content type
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sidebar → **Content Types** | Table of 13 content types |
| 2 | **+ New content type** → `Infographic` (slug `infographic`) → **Save** | Row added, active |
| 3 | Toggle its status | Switches active/inactive |
| 4 | **Edit** → rename to `Infographic / Chart` → **Save** | Name updates |
| 5 | **Delete** → confirm | Row removed |

- [ ] 13 seeded content types shown
- [ ] Create / toggle / edit / delete all work

**Result:** ____

---

## Part 5 — Post Types & content mappings

### TC‑SA‑12 — Browse post types by platform
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sidebar → **Post Types** | A **Platform** dropdown + a table of post types for the first platform |
| 2 | Switch the dropdown to **Instagram** | Table shows Feed Post, Story, Reel, Carousel, Live, Guide |
| 3 | Note the **content types** count chip on **Feed Post** | Shows a number (e.g., 3) and "manage" |

- [ ] Post types load and change with the selected platform

**Result:** ____

### TC‑SA‑13 — Create a post type
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | With **Instagram** selected, **+ New post type** → name `Collab Post` (slug auto `ig-collab`) → **Save** | Toast; **Collab Post** appears with 0 content types |

- [ ] New post type created under the chosen platform

**Result:** ____

### TC‑SA‑14 — Manage content‑type mappings
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | On **Collab Post**, click the **0 types · manage** chip | Modal lists all content types as tick‑boxes |
| 2 | Tick **Image** and **Video** | Each tick saves immediately (toast/none); chip count rises to 2 after closing |
| 3 | Re‑open and untick **Video** | Count drops to 1 |
| 4 | Close modal | Table chip reflects the new count |

- [ ] Ticking adds a mapping; unticking removes it
- [ ] The content‑type count updates accordingly

**Result:** ____

### TC‑SA‑15 — Verify a seeded mapping
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open **manage** on Instagram **Feed Post** | **Image**, **Image + Text**, **Video** are ticked (its seeded formats) |

- [ ] Seeded post↔content mappings are present and correct

**Result:** ____

### TC‑SA‑16 — Clean up test post type
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Delete **Collab Post** → confirm | Removed from the table |

- [ ] Test post type removed

**Result:** ____

---

## Suite sign‑off
- [ ] Companies CRUD ✓  · [ ] Admins CRUD ✓  · [ ] Platforms ✓  · [ ] Content types ✓  · [ ] Post types & mappings ✓
- [ ] Acme Digital, Nova Media, Anita, Vikram remain (needed for docs 04 & 06)
- [ ] Defects logged

**Tester:** __________ **Date:** __________
