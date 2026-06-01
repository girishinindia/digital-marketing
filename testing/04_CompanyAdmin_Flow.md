# 04 — Company Admin Flow

**Goal:** verify user management, **date‑window activation**, grants (post types + content types), and company isolation.
**Precondition:** Acme Digital + admin **Anita Rao** exist (created in doc 03). Sign in as `anita@acme.test` / `Acme@12345`.
**Data:** see `01_Test_Data.md` sections B3–B4. Replace "today + N" with real dates.

Result key: ✅ Pass · ❌ Fail · ⏭️ Skipped

---

## Part 1 — Create users with activation windows

### TC‑CA‑01 — Add an always‑active user
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Sidebar → **Team** | Empty state ("No users yet…") for the new company |
| 2 | **+ Add user** → name `Sara Khan`, email `sara@acme.test`, password `User@12345`, leave both dates blank, Account enabled ON → **Save** | Toast "User created"; row shows window **— → —**, status **active**, **0 post types** |

- [ ] User created; access window blank means active immediately

**Result:** ____

### TC‑CA‑01b — User form validation (email, mobile, password)
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | **+ Add user** → type `Demo@GMAIL.Com` in **Email** | Auto‑lowercases to `demo@gmail.com` |
| 2 | Click the **eye** on the password field | Toggles show/hide |
| 3 | **Mobile**: type letters → then `12345` | Letters ignored; **Save** disabled until exactly 10 digits |
| 4 | Mobile → `9876543210` | Accepted (10 digits) |
| 5 | **Edit** an existing user → the same mobile/password‑eye rules apply (email is read‑only on edit) | Validations enforced |

- [ ] Email auto‑lowercases (create)
- [ ] Password eye works (add & edit)
- [ ] Mobile is digits‑only and exactly 10 (add & edit)

**Result:** ____

### TC‑CA‑02 — Add a scheduled (future) user
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | **+ Add user** → `Tom Lee` / `tom@acme.test` / `User@12345`; **Active from = today + 5**, **Active to = today + 30**; enabled ON → **Save** | Row shows the window; status badge **inactive** (amber) because the start date is in the future |

- [ ] Future‑start user shows as inactive today

**Result:** ____

### TC‑CA‑03 — Add an expired user
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | **+ Add user** → `Mia Wong` / `mia@acme.test` / `User@12345`; **Active from = today − 30**, **Active to = yesterday** → **Save** | Row shows window; status **inactive** (window already ended) |

- [ ] Past‑end user shows as inactive

**Result:** ____

### TC‑CA‑04 — Add a disabled user
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | **+ Add user** → `Leo Das` / `leo@acme.test` / `User@12345`; dates blank; **toggle Account enabled OFF** → **Save** | Row status **inactive** |

- [ ] Disabled account shows inactive regardless of dates

**Result:** ____

---

## Part 2 — Verify login behaviour matches the windows

Do these in an **incognito window** so Anita's session is preserved.

| Step | Sign in as | Expected |
|------|-----------|----------|
| 1 | `sara@acme.test` / `User@12345` | ✅ Logs in to user dashboard |
| 2 | `tom@acme.test` | ❌ "Your access is not active for today's date." |
| 3 | `mia@acme.test` | ❌ "Your access is not active for today's date." |
| 4 | `leo@acme.test` | ❌ "Your account has been deactivated." |

- [ ] Active user logs in
- [ ] Scheduled & expired users blocked with date message
- [ ] Disabled user blocked with deactivated message

**Result:** ____

---

## Part 3 — Activate / deactivate for a date (the headline feature)

### TC‑CA‑05 — Bring a scheduled user live by editing the date
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Team → **Tom Lee** → **Edit** | Modal pre‑filled with his dates |
| 2 | Set **Active from = today** (or clear it) → **Save** | Row status flips to **active** |
| 3 | Incognito: sign in as `tom@acme.test` | ✅ Now logs in |

- [ ] Editing the start date activates the user for the chosen date

### TC‑CA‑06 — Deactivate by setting an end date
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Edit **Sara Khan** → set **Active to = yesterday** → **Save** | Row status flips to **inactive** |
| 2 | Incognito: sign in as Sara | ❌ Blocked with the date message |
| 3 | Edit Sara → clear **Active to** → **Save** | Status returns to **active**; Sara can log in again |

- [ ] Setting a past end date deactivates the user
- [ ] Clearing it restores access

**Result:** ____

### TC‑CA‑07 — Enable / disable toggle
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | On **Leo Das**, click **enable** | Status → active |
| 2 | Incognito: sign in as Leo | ✅ Logs in |
| 3 | Back as Anita → **disable** Leo | Status → inactive; Leo blocked again |

- [ ] Enable/disable link works and is enforced at login

**Result:** ____

---

## Part 4 — Grants (post types + content types)

### TC‑CA‑08 — Assign post types
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | On **Sara Khan**, click the **0 post types** chip | Grants modal opens, post types grouped by platform |
| 2 | Under **Instagram**, tick **Feed Post**, **Story**, **Reel** | Rows highlight as selected |
| 3 | Under **X**, tick **Tweet**, **Thread** | Selected |
| 4 | Click **Save grants** | Toast "Grants updated"; chip now reads **5 post types** |

- [ ] Post types can be granted across platforms
- [ ] Grant count reflects the selection

**Result:** ____

### TC‑CA‑09 — Fine‑tune content types within a post type
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Re‑open Sara's grants | Previously granted post types are still ticked |
| 2 | On **X → Tweet**, click **content types** to expand | Allowed content pills appear, all selected by default |
| 3 | Click pills to keep only **Text** and **Image** (deselect the rest) | Only Text + Image remain highlighted |
| 4 | **Save grants** | Toast confirms |
| 5 | Re‑open grants → expand Tweet | Only **Text** and **Image** are selected (persisted) |

- [ ] Content‑type selection can be narrowed per post type
- [ ] The narrowed selection persists after save & reopen

**Result:** ____

### TC‑CA‑10 — Revoke a post type
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Open Sara's grants → untick **Instagram → Reel** → **Save grants** | Chip drops to **4 post types** |

- [ ] Unticking a post type revokes it

**Result:** ____

---

## Part 5 — Company isolation

### TC‑CA‑11 — Admin sees only their own company's users
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | As **Anita** (Acme), open **Team** | Only Acme users (Sara, Tom, Mia, Leo) appear — **not** GrowUpMore's Priya/Amit/Neha/Karan |
| 2 | Try to open `/companies`, `/platforms` directly | Redirected to `/dashboard` (no super‑admin access) |

- [ ] Admin cannot see other companies' users
- [ ] Admin cannot reach super‑admin pages

**Result:** ____

### TC‑CA‑12 — Reset a user's password
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | Edit **Sara** → set **Reset password = NewPass@123** → **Save** | Toast "User updated" |
| 2 | Incognito: sign in as Sara with `NewPass@123` | ✅ Logs in with the new password |

- [ ] Password reset works

**Result:** ____

### TC‑CA‑13 — Remove a user
| Step | Action | Expected result |
|------|--------|-----------------|
| 1 | On **Mia Wong**, click **Remove** → confirm | Toast; row removed from Team |

- [ ] User can be removed

**Result:** ____

---

## Suite sign‑off
- [ ] User CRUD ✓ · [ ] Date‑window activate/deactivate ✓ · [ ] Grants (post + content) ✓ · [ ] Company isolation ✓
- [ ] Sara remains active **with grants** (needed for doc 05)
- [ ] Defects logged

**Tester:** __________ **Date:** __________
