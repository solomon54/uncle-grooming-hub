# Staff Onboarding & Account Management Specification (SOS v1.0)

**Project:** Uncle Grooming Hub  
**Authority:** PRD v1.0 §2 (RBAC), TAS v1.0 §9 (Security), ECS v1.3  
**Purpose:** Define how all staff accounts are created, managed, and secured. Closes the gap identified in design review — no onboarding flow was defined in any existing spec.

---

## 1. Role Hierarchy

```
System Owner (you)
      │
      ▼
    Admin
      │
      ├──▶ Cashier
      └──▶ Barber
```

| Role | Who Creates Them | Who Manages Their PIN | Can Self-Edit Profile |
|---|---|---|---|
| System Owner | Pre-seeded at deployment | Themselves | Yes |
| Admin | System Owner OR another Admin | Themselves | Yes |
| Cashier | Admin | Admin manages desk terminal PIN; cashier manages personal PIN | Yes (personal data only) |
| Barber | Admin | Themselves (personal PIN) | Yes (personal data + schedule) |

---

## 2. Two Distinct Concepts: Personal Account vs. Desk Terminal

This distinction is critical and must be understood by every agent building any auth-related feature.

### 2.1 Personal Account (Individual Staff)

Every staff member (barber, cashier, admin) has a **personal account** tied to their identity:
- UUID as primary key
- First name, last name, display name
- Role assignment
- Personal PIN (6 digits) — they set this themselves
- Profile photo (optional)
- Contact info (phone/Telegram — for internal comms, not customer-facing)
- Their personal wallet (tip earnings for barbers, desk tip earnings for cashiers)

A personal account belongs to a person. When that person leaves, Admin deactivates the account. The account history remains in the immutable journal — it cannot be deleted, only deactivated.

### 2.2 Desk Terminal PIN (Shared Device Access)

The cashier desk is a shared physical terminal. Multiple people may use it during a shift (a cashier, an admin stepping in). The **desk terminal PIN** is a short access code (4–6 digits) that opens the terminal to the Cashier role session on that device.

- Set and changed by **Admin only**
- Not tied to any individual person
- Does not give access to any personal account data
- When a cashier is fired: Admin deactivates their personal account. The desk terminal PIN may be changed by Admin as a precaution but is not strictly required — the deactivated personal account is what matters.

When a staff member logs in on any terminal, they enter:
1. The desk terminal PIN (to prove physical access) — role-agnostic, terminal-specific
2. Their personal PIN (to identify themselves and load their personal session)

This two-factor model means: even if someone knows the desk PIN, they cannot act as another person without that person's personal PIN.

---

## 3. System Owner — Super-Admin Bootstrap

The System Owner is the deployer of the system. This is the person who sets up the shop and controls everything at the highest level.

### 3.1 Bootstrap (One-Time Setup)

During initial deployment, a protected setup endpoint is run once:

```
POST /api/setup/bootstrap
{
  owner_name: string,
  owner_phone: string,
  owner_pin: string   // 6-digit, chosen by owner
}
```

This endpoint:
1. Checks if bootstrap has already run (if yes, returns 403 — cannot run twice)
2. Creates the System Owner account with role `SYSTEM_OWNER`
3. Commits `EVENT 13 — OPERATOR_SESSION_OPENED` for the setup session
4. Returns a one-time setup token valid for 24 hours to complete initial Admin creation

The bootstrap endpoint is then permanently disabled. No second owner can be created this way.

### 3.2 System Owner Capabilities

The System Owner can do everything an Admin can do, plus:
- Create and deactivate Admin accounts
- View all financial data across all roles
- Access the raw sync health dashboard
- Cannot be deactivated by any Admin

### 3.3 System Owner in RBAC Table (ECS Amendment)

Add `SYSTEM_OWNER` to the authority table. System Owner emits the same events as Admin plus can emit staff provisioning events (new event type — see §6).

---

## 4. Staff Account Lifecycle

### 4.1 Creating a New Staff Account (Admin Flow)

Admin navigates to the Staff Management section of the Admin panel. Clicks "Add Staff Member."

**Admin provides:**
- First name, last name
- Role: Barber OR Cashier
- Display name (shown on status board and internal screens)
- Starting PIN (temporary — staff must change on first login)
- Phone or Telegram handle (for internal notifications)
- For barbers: profile photo (optional), specialty tags (optional)
- For barbers: initial schedule (days and hours — can be updated later by the barber)

**System commits:** `EVENT 27 — STAFF_ACCOUNT_CREATED` (new event — see §6)

**Onboarding notification:** System sends the new staff member a Telegram/SMS message:
"Welcome to Uncle Grooming Hub! Your account has been created. Your temporary PIN is [XXXX]. Log in and change it immediately. — Admin"

### 4.2 First Login (New Staff)

New staff member logs in on any terminal:
1. Enters desk terminal PIN (given by Admin)
2. Enters their temporary PIN
3. System detects `is_first_login: true`
4. Forces PIN change screen: "Set your personal PIN"
5. Staff sets new personal PIN (6 digits, must differ from temporary)
6. `EVENT 28 — STAFF_PIN_CHANGED` committed
7. Normal session begins

### 4.3 Staff Self-Edits (What Staff Can Change Themselves)

| Field | Barber | Cashier | Admin |
|---|---|---|---|
| Display name | ✅ | ✅ | ✅ |
| Profile photo | ✅ | ✅ | ✅ |
| Personal PIN | ✅ | ✅ | ✅ |
| Phone / Telegram | ✅ | ✅ | ✅ |
| Recurring schedule | ✅ | ❌ | ❌ |
| Service prices | ❌ | ❌ | ✅ |
| Other staff data | ❌ | ❌ | ✅ |

Staff access their profile via the "My Profile" section in their role dashboard. Changes commit the appropriate event to the journal.

### 4.4 Deactivating a Staff Account (Admin Flow)

When a staff member leaves:
1. Admin navigates to Staff Management, finds the account
2. Clicks "Deactivate Account"
3. System requires Admin to confirm with their own PIN (prevents accidental deactivation)
4. `EVENT 29 — STAFF_ACCOUNT_DEACTIVATED` committed
5. All active sessions for that `actor_id` are immediately invalidated
6. The account appears as "Inactive" in the roster
7. All historical events from that actor remain in the journal — the audit trail is preserved

A deactivated account cannot log in. Their past transactions, tips, and service history remain in the ledger.

**Desk terminal PIN change:** After deactivating a cashier, Admin should change the desk terminal PIN as a precaution. This is a separate action — it does not happen automatically.

### 4.5 Re-activating a Staff Account

If someone returns after leaving, Admin can reactivate their account. `EVENT 30 — STAFF_ACCOUNT_REACTIVATED` committed. Their history and wallet balances are fully restored (the ledger never lost them).

### 4.6 PIN Reset by Admin (When Staff Forgets PIN)

If a staff member forgets their personal PIN:
1. Admin navigates to the staff member's profile
2. Clicks "Reset PIN"
3. System generates a new temporary PIN
4. `EVENT 28 — STAFF_PIN_CHANGED` committed with `reset_by: 'ADMIN'`
5. Staff member receives notification with temporary PIN
6. Staff is forced to change PIN on next login

Admin cannot view a staff member's current PIN — only reset it to a new temporary one.

---

## 5. Cashier Desk Terminal Management

### 5.1 Setting the Desk Terminal PIN

The desk terminal PIN is set per-terminal by Admin. Admin navigates to Terminal Management in the Admin panel, selects the terminal, and sets a 4–6 digit PIN.

`EVENT 31 — TERMINAL_PIN_CHANGED` committed with `terminal_id`, `changed_by_actor_id`. The PIN itself is never stored in the event — only its HMAC hash.

### 5.2 Changing the Desk Terminal PIN

Same flow as setting. Admin can change at any time. A reason code is encouraged but not required. Best practice: change after any staff departure.

### 5.3 Multiple Terminals

Each physical device has its own `terminal_id` and its own desk PIN. A barber tablet and a cashier tablet have different desk PINs. Admin sets each independently.

---

## 6. New Events Required (ECS v1.4 Additions)

These events must be added to ECS when it is next versioned.

### EVENT 27 — STAFF_ACCOUNT_CREATED
- **Emitter:** Local Terminal (Admin or System Owner)
- **Aggregate:** CustomerProfile (reused for staff — staff are also system actors with profiles)
- **Authority:** Local
- **Payload:**
  ```
  actor_uuid:       string   // new staff member's UUID
  role:             'BARBER' | 'CASHIER' | 'ADMIN'
  display_name:     string
  contact_handle:   string   // phone or telegram handle (stored encrypted)
  is_first_login:   boolean  // always true on creation
  ```
- **State Effect:** Creates new staff profile in `ACTIVE` state.

### EVENT 28 — STAFF_PIN_CHANGED
- **Emitter:** Local Terminal (self or Admin reset)
- **Aggregate:** CustomerProfile
- **Authority:** Local
- **Payload:**
  ```
  actor_uuid:       string
  reset_by:         'SELF' | 'ADMIN'
  pin_hash:         string   // HMAC-SHA256 of new PIN — never plaintext
  ```
- **State Effect:** Updates PIN hash on staff profile. Invalidates all active sessions for this actor.

### EVENT 29 — STAFF_ACCOUNT_DEACTIVATED
- **Emitter:** Local Terminal (Admin or System Owner)
- **Aggregate:** CustomerProfile
- **Authority:** Local
- **Payload:**
  ```
  actor_uuid:       string
  deactivated_by:   string   // Admin's actor_uuid
  reason_code:      'RESIGNATION' | 'TERMINATION' | 'TEMPORARY_LEAVE' | 'OTHER'
  ```
- **State Effect:** Staff profile → `INACTIVE`. All active sessions for `actor_uuid` invalidated immediately.

### EVENT 30 — STAFF_ACCOUNT_REACTIVATED
- **Emitter:** Local Terminal (Admin or System Owner)
- **Aggregate:** CustomerProfile
- **Authority:** Local
- **Payload:**
  ```
  actor_uuid:       string
  reactivated_by:   string
  ```
- **State Effect:** Staff profile → `ACTIVE`. Requires new PIN set on next login.

### EVENT 31 — TERMINAL_PIN_CHANGED
- **Emitter:** Local Terminal (Admin or System Owner)
- **Aggregate:** TerminalSession
- **Authority:** Local
- **Payload:**
  ```
  terminal_id:      string
  changed_by:       string   // Admin's actor_uuid
  pin_hash:         string   // HMAC of new desk PIN
  ```
- **State Effect:** Updates desk terminal PIN for this `terminal_id`.

---

## 7. Admin Panel — Staff Management UI

The Admin panel's Staff Management section contains:

### Staff List View
- Table: Display name, Role, Status (Active/Inactive), Last Login (HLC), Actions
- Filter by: Role, Status
- Search by: Name

### Add Staff Form
Fields as described in §4.1. "Save" button commits `EVENT 27`.

### Staff Detail View
- Profile info (read-only with Edit button)
- Role badge
- Status (Active/Inactive) with toggle
- "Reset PIN" button
- Wallet summary (tip earnings for barbers/cashiers — aggregate totals)
- Last 10 service events (for barbers)
- "Deactivate" / "Reactivate" button

### Terminal Management View
- Table of all registered terminals: Terminal ID, Nickname, Last Seen, Desk PIN status (Set/Not Set)
- "Change Desk PIN" action per terminal

---

## 8. Security Invariants for Staff Accounts

These rules apply at all times and must be enforced in `journal.service.ts`:

1. **A cashier cannot create or deactivate other accounts** — only Admin and System Owner may emit `EVENT 27`, `29`, `30`.
2. **A barber cannot change another barber's schedule** — `EVENT 23` is only valid when `actor_id` matches the barber being updated OR the actor has Admin role.
3. **No actor can view another actor's personal PIN** — PINs are stored as HMAC hashes only. Recovery is always via reset, never via retrieval.
4. **Session invalidation on deactivation is immediate** — when `EVENT 29` is processed locally, any active `sessionStorage` for that `actor_id` must be cleared. On other terminals, the session invalidation propagates via sync within the sync window.
5. **The System Owner account cannot be deactivated** — `EVENT 29` with `actor_uuid = system_owner_uuid` must be rejected by `journal.service.ts` with reason `PROTECTED_ACCOUNT`.
6. **Staff account creation requires Admin session** — `journal.service.ts` validates that the emitting session's role is `ADMIN` or `SYSTEM_OWNER` before accepting `EVENT 27`.

---

## 9. Barber Profile — What Gets Set Up

When a barber account is created, the following is configured during onboarding:

| Field | Set By | When | Event |
|---|---|---|---|
| Name, photo, PIN | Admin initially, barber updates | Account creation | EVENT 27, then EVENT 28 |
| Recurring schedule | Barber (or Admin initially) | Any time | EVENT 23 |
| Service specialty tags | Admin | Account creation or edit | EVENT 27 / admin edit |
| Active/Inactive status | Admin | Any time | EVENT 29 / EVENT 30 |

The barber's profile photo is displayed on:
- The public status board (next to their lane column) — provides warm, personal feel
- The barber's own dashboard
- The cashier's queue management screen

Photo is stored via Cloudinary. Only the URL is stored in the event payload.

---

## 10. Desk Terminal Registration

When a new physical device is set up in the shop:

1. Admin navigates to Terminal Management → "Register New Terminal"
2. On the new device, Admin opens the app and navigates to `/setup/terminal`
3. The app generates a `terminal_id` (locally, via `terminal.identity.ts`) and displays a registration code
4. Admin enters the registration code in the Admin panel
5. Admin gives the terminal a nickname (e.g., "Cashier Desk", "Barber 1 Tablet")
6. `EVENT 13 — OPERATOR_SESSION_OPENED` is committed with role `SETUP` to link the terminal
7. Admin sets the desk PIN for this terminal via `EVENT 31`
8. Terminal is now registered and ready

Terminals without a registered desk PIN cannot open operational sessions.

---

*SOS v1.0 — Uncle Grooming Hub*  
*Governs all staff account creation, management, and terminal access.*  
*ECS events 27–31 are pending addition to ECS v1.4.*
