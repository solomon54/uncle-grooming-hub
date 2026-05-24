---
inclusion: auto
---

# Uncle Grooming Hub — UI Standards & Implementation Guide v2.1

**Authority:** This document governs every pixel, component, animation, and UI behavior.  
**Stack:** Next.js 16 (App Router), Tailwind v4, Framer Motion 11, RxDB 17, Pusher JS  
**Read AGENT.md first. This document covers the visual and behavioral layer only.**  
**Changes from v2.0:** Login flow (no role selection), Pusher real-time notifications, mobile-first layout corrections, cashier payment display rule, trusted customer registration flow, tip visibility correction.

---

## 0. What UI Is and Is Not Allowed To Do

UI components are dumb renderers of projection output.

**UI MAY:**
- Call hooks from `src/ui/hooks/` and render their output
- Call action creators from `src/core/actions/` in response to user gestures
- Hold ephemeral UI state: modal open/closed, input field value, hover state, loading spinner
- Show optimistic feedback (greyed-out entry, spinner) after dispatching an action
- Redirect to `/login` when `useSession()` returns null
- Subscribe to Pusher channels via `usePusher()` hook for real-time updates

**UI MUST NOT:**
- Import from `src/core/journal/`, `src/core/db/`, or `src/core/projection/` directly
- Call `commitEvent()` directly
- Compute durations, wait times, queue positions, totals, or any domain value
- Hold domain data in `useState` (queue entries, barber states, transactions)
- Call `Date.now()` or `new Date()` for any ordering or business logic
- Make `fetch()` calls (exception: `/reserve` and `/track` may call Cloud API)
- Show tip amounts on any cashier-facing surface — ever

---

## 1. Design Language

The aesthetic is **Cinema Dark** — premium, focused, low-friction. Think: a luxury barbershop at 11pm. High contrast. Minimal chrome. Gold accents that earn their place. Information that surfaces only when needed.

**Character:** Serious. Warm. Precise. Never playful. Never corporate.

**What makes this unforgettable:** The gold is not decoration — it is signal. Every gold element means "this is actionable" or "this is the most important thing here." Everything else recedes into charcoal.

---

## 2. Typography

**Font stack:** `'Geist', 'DM Sans', system-ui, sans-serif`  
Use `next/font` for Geist. Fall back to DM Sans for numbers-heavy displays.

Use `clamp()` for all headings. Never use fixed large sizes — they break mobile.

```
Display (hero only):  clamp(32px, 5vw, 64px)    font-weight: 900
H1 (page title):      clamp(24px, 4vw, 48px)    font-weight: 900
H2 (section title):   clamp(20px, 3vw, 36px)    font-weight: 800
H3 (card title):      clamp(15px, 2vw, 20px)    font-weight: 700
Body large:           16px / line-height: 1.7
Body base:            14px / line-height: 1.6
Body small:           13px / line-height: 1.5
Label/eyebrow:        11px / tracking: 0.15em / uppercase / weight: 700
Caption:              12px / color: rgba(255,255,255,0.4)
Mono (HLC, IDs):      13px / font-family: 'Geist Mono', monospace
```

**Mobile floor rule:** No text below 12px on any screen. No heading above 32px on screens narrower than 400px — `clamp()` handles this automatically when lower bound is set correctly.

**Eyebrow labels:**
- Always: 11px, uppercase, letter-spacing: 0.15em, color: `#e2d609`
- Always displayed ABOVE the heading it labels
- Never on buttons. Never in running text.

**Bilingual rule (Amharic/English):** All operational text supports both. Amharic at same font size. Use `lang="am"` attribute on Amharic spans. Toggle persisted in `localStorage` key `lang_preference`.

---

## 3. Color System

All colors defined as CSS variables in `globals.css`. Never hardcode hex values in component files.

```css
:root {
  /* Backgrounds */
  --bg-base:       #0f1317;
  --bg-surface:    #171d22;
  --bg-card:       #1e262d;
  --bg-input:      #252f38;
  --bg-hover:      #242e37;

  /* Borders */
  --border:        #2d3840;
  --border-focus:  #e2d609;
  --border-subtle: #1e262d;

  /* Gold — Signal Colors */
  --gold-primary:  #e2d609;
  --gold-secondary:#c9973a;
  --gold-glow:     rgba(226, 214, 9, 0.15);
  --gold-glow-lg:  rgba(226, 214, 9, 0.25);

  /* Text */
  --text-primary:  #f5f5f5;
  --text-secondary:rgba(255,255,255,0.6);
  --text-muted:    rgba(255,255,255,0.4);
  --text-disabled: rgba(255,255,255,0.25);
  --text-gold:     #e2d609;

  /* State Colors */
  --state-waiting:  #3b82f6;
  --state-called:   #f59e0b;
  --state-engaged:  #10b981;
  --state-settled:  #6366f1;
  --state-expired:  #6b7280;
  --state-error:    #ef4444;
  --state-reserved: #8b5cf6;

  /* Sync Status */
  --sync-local:     #f59e0b;
  --sync-sending:   #3b82f6;
  --sync-verified:  #10b981;
}
```

Section backgrounds alternate: odd → `var(--bg-base)`, even → `var(--bg-surface)`.  
Section boundary: `border-top: 1px solid var(--border)`.

---

## 4. Spacing & Layout System

All spacing on an 8pt grid. No half-pixel values.

```
Section vertical padding:   clamp(40px, 8vw, 80px) top/bottom
Section horizontal padding: clamp(16px, 4vw, 48px)
Inner container:            max-width: 1280px; margin: 0 auto; width: 100%
Card padding:               clamp(14px, 3vw, 24px)
Gap between cards:          clamp(10px, 2vw, 20px)
Heading → body gap:         16px
Body → CTA gap:             32px
TopBar height:              56px
Operational content pad:    16px (mobile), 24px (desktop)
```

**The container rule that prevents overflow:**  
Every page root element and every section inner wrapper MUST have:
```css
width: 100%;
max-width: 1280px;
margin: 0 auto;
box-sizing: border-box;
overflow-x: hidden;   /* on the page root only */
```

**Never set a fixed pixel width on any element that might contain text.**  
Use `width: 100%`, `min-width: 0`, and `flex: 1` instead.

---

## 5. Mobile-First Layout System

**This is the most important section for mobile correctness.**  
Every layout is designed mobile-first and expands upward. There is no "desktop layout that also works on mobile" — that approach always breaks.

### 5.1 Breakpoints

```
xs:  < 360px   Very small phones — minimum supported
sm:  ≥ 400px   Standard phones
md:  ≥ 640px   Large phones, small tablets
lg:  ≥ 1024px  Tablets, small laptops
xl:  ≥ 1280px  Desktop
```

### 5.2 Viewport Height — Use `dvh` Not `vh`

On mobile, `100vh` includes the browser chrome (address bar), causing content to be hidden below the fold. Always use:
```css
height: 100dvh;        /* dynamic viewport height — correct on mobile */
min-height: 100dvh;    /* for screens that should fill the viewport */
```

Never use `height: 100vh` on mobile-facing screens. The operational screens, login screen, and status board must all use `100dvh`.

### 5.3 Full-Screen Screen Shell (Operational Screens)

```css
/* The outermost wrapper for all operational screens */
.screen-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100dvh;           /* fills exactly the visible viewport */
  overflow: hidden;          /* prevents body scroll — content scrolls internally */
  background: var(--bg-base);
}

/* TopBar — fixed height, never shrinks */
.topbar {
  flex-shrink: 0;
  height: 56px;
  width: 100%;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
}

/* Content area — takes all remaining height, scrolls internally */
.screen-content {
  flex: 1;
  min-height: 0;            /* critical: allows flex child to scroll */
  overflow-y: auto;
  padding: 16px;            /* mobile */
}

@media (min-width: 1024px) {
  .screen-content {
    padding: 24px;
  }
}
```

### 5.4 Two-Panel Layout (Cashier, Settlement) — Mobile Collapse Rule

On desktop (≥1024px): two columns side by side (60% list / 40% action panel).  
On mobile (<1024px): single column. The action panel becomes a **bottom sheet**.

```css
/* Desktop: side by side */
@media (min-width: 1024px) {
  .two-panel {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 24px;
    height: 100%;
  }
}

/* Mobile: single column, action panel is a bottom sheet */
@media (max-width: 1023px) {
  .two-panel {
    display: block;
    height: 100%;
    overflow-y: auto;
  }
  
  .action-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-surface);
    border-top: 1px solid var(--border);
    border-radius: 20px 20px 0 0;
    padding: 20px 16px;
    transform: translateY(100%);
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 100;
    max-height: 80dvh;
    overflow-y: auto;
  }
  
  .action-panel.open {
    transform: translateY(0);
  }
}
```

### 5.5 Cards — Always Fluid

```css
.card {
  width: 100%;              /* never fixed width */
  box-sizing: border-box;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: clamp(14px, 3vw, 20px);
}
```

### 5.6 Text Overflow Prevention

Any text element that could overflow (customer name, service name, barber name) must have:
```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
min-width: 0;    /* critical inside flex containers */
```

### 5.7 Touch Targets

- Minimum tap target: 44×44px on every interactive element
- Queue entry rows: minimum 60px tall on mobile
- Buttons: minimum 44px tall, padding at least 12px vertical
- Never place two tappable elements closer than 8px apart

### 5.8 TopBar on Small Screens

```
< 400px:  Role badge shows icon only (no text). Actor name hidden. Sync dot only.
≥ 400px:  Role badge shows role name. Actor name shown.
≥ 640px:  Full topbar with all elements.
```

### 5.9 Admin Sidebar

Admin sidebar: only on ≥1024px. On mobile, sidebar becomes a slide-in drawer triggered by a menu button in the TopBar. Drawer overlays content, 80% screen width maximum.

---

## 6. Component Library

### 6.1 — Buttons

Four types. Use inline styles for reliability under Tailwind v4.

```tsx
// PRIMARY — gold filled
style={{
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
  padding: "13px 28px", borderRadius: "9999px",
  background: "var(--gold-primary)", color: "#0f1317",
  fontSize: "14px", fontWeight: 800, letterSpacing: "0.02em",
  border: "none", cursor: "pointer", width: "100%", maxWidth: "320px",
  boxShadow: "0 0 24px var(--gold-glow-lg)",
  transition: "all 0.2s ease",
}}
// On mobile: width: "100%" — buttons fill their container

// SECONDARY — outlined gold
style={{
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
  padding: "12px 28px", borderRadius: "9999px",
  background: "transparent", color: "var(--gold-primary)",
  fontSize: "14px", fontWeight: 700, width: "100%", maxWidth: "320px",
  border: "2px solid var(--gold-primary)", cursor: "pointer",
  transition: "all 0.2s ease",
}}

// GHOST — minimal
style={{
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
  padding: "12px 28px", borderRadius: "9999px",
  background: "transparent", color: "var(--text-secondary)",
  fontSize: "14px", fontWeight: 600, width: "100%", maxWidth: "320px",
  border: "1px solid var(--border)", cursor: "pointer",
  transition: "all 0.2s ease",
}}

// DANGER — destructive
style={{
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
  padding: "12px 28px", borderRadius: "9999px",
  background: "transparent", color: "var(--state-error)",
  fontSize: "14px", fontWeight: 700, width: "100%", maxWidth: "320px",
  border: "2px solid var(--state-error)", cursor: "pointer",
  transition: "all 0.2s ease",
}}
```

**Button rules:**
- On mobile: buttons are full-width within their container (use `width: 100%`)
- On desktop: buttons use `width: auto` / `maxWidth: 320px`
- One PRIMARY button per screen section maximum
- Destructive actions always use DANGER + confirmation step
- Disabled: opacity 0.4, cursor not-allowed, and `disabled` attribute

### 6.2 — Cards

```tsx
// Standard card — always fluid width
style={{
  width: "100%",
  boxSizing: "border-box",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "clamp(14px, 3vw, 20px)",
}}

// Active/selected card
style={{
  width: "100%",
  boxSizing: "border-box",
  background: "var(--bg-card)",
  border: "1px solid var(--gold-primary)",
  borderRadius: "12px",
  padding: "clamp(14px, 3vw, 20px)",
  boxShadow: "0 0 0 1px var(--gold-primary), 0 0 20px var(--gold-glow)",
}}
```

### 6.3 — Status Badges

```tsx
const badgeStyle = (status: string) => ({
  display: "inline-flex", alignItems: "center", gap: "6px",
  padding: "4px 10px", borderRadius: "9999px",
  fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  whiteSpace: "nowrap" as const,      // never wraps
  flexShrink: 0,                       // never squishes
  background: stateColor(status, 0.15),
  color: stateColor(status, 1),
  border: `1px solid ${stateColor(status, 0.3)}`,
})
```

### 6.4 — Sync Indicator

Lives in TopBar. Three states — amber pulsing dot (local only), blue spinning dot (sending), green static dot (cloud verified). Text: 11px, `var(--text-muted)`. Never intrusive. `useSyncStatus()` hook → `<SyncIndicator />` component.

### 6.5 — Inputs

```tsx
// Text input
style={{
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 16px",
  background: "var(--bg-input)", border: "1px solid var(--border)",
  borderRadius: "10px", color: "var(--text-primary)",
  fontSize: "16px",    // 16px minimum prevents iOS auto-zoom on focus
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
}}
// Focus: borderColor: "var(--border-focus)", boxShadow: "0 0 0 3px var(--gold-glow)"
// Error: borderColor: "var(--state-error)", boxShadow: "0 0 0 3px rgba(239,68,68,0.15)"
```

**Critical mobile rule:** Input `font-size` must be at minimum `16px`. Below 16px, iOS Safari auto-zooms the page on focus — this breaks the layout. Set `font-size: 16px` on all `<input>` and `<textarea>` elements.

### 6.6 — Real-Time Notification Toast

In-app toast that appears when Pusher pushes an event to the customer's tracking page or any operational screen.

```tsx
// Toast positioning — mobile safe
style={{
  position: "fixed",
  top: "calc(56px + 12px)",   // below topbar
  left: "16px",
  right: "16px",               // full width on mobile
  maxWidth: "420px",
  margin: "0 auto",
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "14px 16px",
  zIndex: 200,
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
}}
```

Toast types:
- `QUEUE_MOVED` — blue left border — "You moved up! Position [N]"
- `CALLED_TO_CHAIR` — gold left border + pulse — "It's your turn! Go to [Barber Name]"
- `PAYMENT_SETTLED` — green left border — "Payment confirmed ✓"
- `GENERAL` — subtle grey left border

---

## 7. Login Screen — Credentials, No Role Selection

**This is the correct login flow.** The user never chooses their role. The system detects it.

### 7.1 What the Login Screen Shows

```
┌─────────────────────────────────────────┐
│                                         │
│         Uncle Grooming Hub              │  Logo + name, centered
│                                         │
│    ─────────────────────────────        │
│                                         │
│    Username or Email                    │  Label above input
│    [________________________]           │  Full-width input
│                                         │
│    Password                             │
│    [________________________] 👁        │  Password toggle
│                                         │
│    [ Sign In ]                          │  PRIMARY button, full width
│                                         │
│    Forgot PIN?  →                       │  Ghost link, small
│                                         │
└─────────────────────────────────────────┘
```

- No role dropdown. No role radio buttons. No PIN box grid on this screen.
- On submit: system looks up account by username/email, verifies password hash, reads role from account record.
- On success: system redirects automatically:
  - `BARBER` → `/barber/[their_barber_id]`
  - `CASHIER` → `/cashier`
  - `ADMIN` → `/admin`
  - `SYSTEM_OWNER` → `/admin`
- On failure: show error below the form — "Incorrect credentials. Please try again." Shake animation on inputs.
- After 5 failed attempts: lockout for 60 seconds with countdown visible.

### 7.2 First Login (New Staff — Forced PIN Change)

When `is_first_login: true` on the session:
1. After successful credential verification, before redirect, show the "Set Your PIN" screen
2. New staff sets their personal PIN (6 digits)
3. Confirm PIN field (must match)
4. "Save PIN" → commits EVENT 28 → session is now fully established → redirect to role screen

### 7.3 Layout Spec

```css
/* Login page root */
.login-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100dvh;
  padding: 24px 16px;
  box-sizing: border-box;
  background: var(--bg-base);
}

/* Login card */
.login-card {
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
```

No fixed heights. No pixel widths on the card. The `max-width: 400px` + `width: 100%` pattern ensures it looks great on all screens from 320px up.

### 7.4 Desk Terminal PIN (Separate Concept)

The desk terminal PIN (4–6 digit code that unlocks the shared device) is a separate step that happens before the login screen when using a shared physical cashier terminal. The flow on a shared terminal:

1. Device shows "Tap to start" (sleep state)
2. Staff taps → desk terminal PIN prompt (4–6 digit pad)
3. Desk PIN correct → personal login screen appears (username + password)
4. Personal credentials correct → session opened, role detected, redirect

On a personal device (barber's own tablet): skip step 2.

---

## 8. Operational Screen Specs

### 8.1 — Cashier Screen (`/cashier`)

**What cashier sees — financial display rule:**

The cashier terminal shows service subtotal ONLY. Tips are invisible to the cashier.

```
CORRECT — what cashier sees:
  Service total:   500 ETB   ✓
  Status:          SETTLED

WRONG — never show this to cashier:
  Service:         500 ETB
  Barber tip:       70 ETB   ✗ — never visible to cashier
  Desk tip:         30 ETB   ✗ — never visible to cashier
  Total:           600 ETB   ✗ — never show a tip-inclusive total
```

The cashier's settlement confirmation says: "500 ETB service payment received and confirmed." The full 600 ETB flowed through the gateway. The ledger split internally. The cashier's job is done.

**Why:** Tips are a private arrangement between the customer and each individual. If the cashier sees the tip, it creates ambiguity, pressure, and potential for disputes. The business revenue (500 ETB) is what the cashier account is responsible for.

**Layout:**
- Mobile (<1024px): queue list full width, action panel as bottom sheet
- Desktop (≥1024px): queue list (60%) + action panel (40%) side by side

**Queue list item (mobile-safe):**
```tsx
style={{
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "14px 16px",
  minHeight: "60px",           // touch target
  background: "var(--bg-card)",
  borderBottom: "1px solid var(--border-subtle)",
  width: "100%",
  boxSizing: "border-box",
}}

// Token badge (e.g., "A-07")
style={{
  flexShrink: 0,
  width: "44px", height: "44px",
  borderRadius: "10px",
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: "13px", fontWeight: 700, fontFamily: "monospace",
  color: "var(--text-gold)",
}}

// Customer name (truncates if long)
style={{
  flex: 1,
  minWidth: 0,              // allows truncation in flex
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--text-primary)",
}}
```

### 8.2 — Barber Dashboard (`/barber/[id]`)

Full-screen cockpit. Minimal. Decisive.

**Mobile layout:** Single column. Status fills the top 40% of the content area. Upcoming client info below. Action button pinned near bottom with `margin-top: auto` in the flex column.

**No horizontal scroll. No fixed-width elements.**

States and actions remain as defined in v2.0 §7.3. Layout updated for mobile-first.

### 8.3 — Settlement Screen (`/settlement`)

Same two-panel → bottom sheet mobile rule as cashier screen.

**What settlement screen shows:**
- Service itemization (locked at EVENT 04) — service names and prices
- Service subtotal
- Payment method
- Status badge
- "Confirm Cash" button (for cash payments)
- QR display (for digital payments)

**What it NEVER shows:**
- Barber tip amount
- Cashier/desk tip amount
- Any tip-inclusive total

The QR payment link goes to the customer's own device. Whatever they add as tip on that screen goes directly into the ledger split. It never surfaces back to the cashier terminal.

### 8.4 — Admin Screen (`/admin`)

Admin sidebar: slide-in drawer on mobile (<1024px), persistent sidebar on desktop (≥1024px).

Four sections (unchanged from v2.0):
1. Audit Log
2. Shop Configuration (including tip pre-built amounts config)
3. Sync Health
4. Quality Alerts

Staff Management section added (see STAFF_ONBOARDING.md):
5. Staff Management — add, edit, deactivate staff accounts
6. Terminal Management — register terminals, manage desk PINs

### 8.5 — Status Board (`/status`)

Full-screen. No controls. TV/monitor display.

**Layout uses queue tokens prominently:**
- Each barber column shows: barber photo, barber name, current customer token (large), waiting tokens below
- Status board reads identical token values as customer's tracking page

Design rules unchanged from v2.0 §7.6. Status board layout is column-based, not responsive — it is designed for a landscape TV screen, not a phone.

---

## 9. Customer Tracking Page (`/track/[token]`)

**This is a public page, no session required.**  
Customer opens this on their own phone after check-in.

### 9.1 Layout

```css
.tracking-root {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: 100dvh;
  padding: 24px 16px 40px;
  box-sizing: border-box;
  background: var(--bg-base);
  gap: 20px;
}
```

All content centered, fluid width, `max-width: 480px; margin: 0 auto` on the content card.

### 9.2 Real-Time Updates via Pusher

The tracking page subscribes to a Pusher channel named `queue-token-{token}` (e.g., `queue-token-A07`).

When any of the following happen, the server pushes an event to this channel and the page updates instantly without refresh:
- Customer moves up in queue → `queue.moved` event → position counter updates
- Customer is called to chair → `queue.called` event → page shows "It's your turn!" banner
- Service starts → `queue.engaged` event → page shows "Your service is in progress"
- Payment QR is ready → `payment.ready` event → QR appears on page
- Payment confirmed → `payment.settled` event → page shows confirmation and optional account creation prompt

**No polling. No manual refresh. No Telegram app required.**

### 9.3 Content Shown to Customer

```
┌─────────────────────────────────┐
│  Uncle Grooming Hub             │
│                                 │
│  Your Ticket                    │  eyebrow label
│  A-07                           │  large, gold, monospace, 48px
│                                 │
│  ────────────────────────────   │
│                                 │
│  📍 Dawit's Lane                │  barber name
│  Position 2                     │  current position
│  Est. ~25–35 min                │  range, never precise
│                                 │
│  Currently in chair: A-05       │  current customer token
│                                 │
│  Your services:                 │
│  • Haircut           350 ETB    │
│  • Beard Trim        150 ETB    │
│  ──────────────────────────     │
│  Subtotal            500 ETB    │
│                                 │
│  [ Cancel my spot ]             │  GHOST button — before service
│                                 │
└─────────────────────────────────┘
```

When called state is reached (`queue.called` Pusher event):
- Banner slides down from top: gold background, "It's your turn! Go to Dawit. 🪒"
- Cancel button disappears (service about to start)

When payment QR appears (`payment.ready` event):
- QR renders in the card
- Tip fields appear below the QR
- Total updates live as customer adjusts tip
- "Pay with Telebirr" / "Pay with Chapa" / "Pay cash at desk" buttons

---

## 10. Trusted Customer Registration Flow (In-App)

After payment is confirmed (`payment.settled` Pusher event on the tracking page), the page transitions to a post-payment screen. If the customer does NOT already have a Verified Account, this screen appears:

### 10.1 The Post-Payment Prompt

```
┌─────────────────────────────────┐
│  Payment confirmed ✓            │  green check, animated
│                                 │
│  You just earned                │
│  25 loyalty points 🎁           │  gold, prominent
│                                 │
│  Save them for next time?       │
│                                 │
│  [ Create my account ]          │  PRIMARY — takes to step 2
│  [ No thanks ]                  │  GHOST — dismisses, no account
│                                 │
└─────────────────────────────────┘
```

This prompt appears once per visit. "No thanks" is always available with zero pressure.

### 10.2 Account Creation Steps (If Customer Taps "Create my account")

**Step 1 — Confirm phone number:**
```
Your number: +251 9** *** 789   (pre-filled, masked)
Is this correct? [ Yes ] [ Change ]
```
If "Yes" → system sends OTP to the phone number already on their Shadow Profile.

**Step 2 — Enter OTP:**
```
Enter the 6-digit code we sent to your phone
[ ] [ ] [ ] [ ] [ ] [ ]
Resend code (30s cooldown)
```

**Step 3 — Set password:**
```
Create a password (at least 8 characters)
[________________________]
Confirm password
[________________________]
[ Create account ]
```

**Step 4 — Welcome:**
```
Welcome, [First Name]! 🎉
Your account is ready.
25 points saved.
[ View my profile ]  [ Done ]
```

On completion: `EVENT 10 — ACCOUNT_VERIFIED` is committed. Shadow Profile → Verified Account. All history, preferences, and points carry forward.

### 10.3 Returning Verified Customers

When a returning customer checks in and their phone number matches a Verified Account, their loyalty points, preferred barber, and service history are pre-loaded. The post-payment screen does NOT show the account creation prompt — instead it shows:

```
Payment confirmed ✓
+18 points added to your account
Total: 143 points
```

---

## 11. Real-Time Notifications — Pusher Architecture

### 11.1 Why Pusher (Not Telegram, Not SMS for In-App)

The system is a web app. Customers access it in their browser. Pusher enables the server to push updates to that browser tab the moment something changes. The customer keeps the tracking page open on their phone — it stays live without any refreshes.

Telegram and SMS are external apps and services. They are useful only as fallback for customers who have closed the tracking page. The primary notification channel is always the in-app Pusher push.

### 11.2 Pusher Channels Used

| Channel | Who subscribes | Events pushed |
|---|---|---|
| `queue-token-{TOKEN}` | Customer tracking page | queue.moved, queue.called, queue.engaged, payment.ready, payment.settled |
| `barber-lane-{BARBER_ID}` | Barber dashboard | lane.customer_called, lane.customer_arrived, lane.service_started |
| `cashier-{TERMINAL_ID}` | Cashier screen | queue.new_entry, payment.settled, payment.failed |
| `shop-status` | Status board | Any queue state change |
| `admin-{SHOP_ID}` | Admin panel | sync.anomaly, quality.alert, terminal.offline |

### 11.3 What Gets Pushed and When

| System event | Pusher event pushed | Channel(s) |
|---|---|---|
| EVENT 01 (checked in) | `queue.new_entry` | `cashier`, `shop-status` |
| EVENT 03 (called to chair) | `queue.called` | `queue-token-{TOKEN}`, `barber-lane-{ID}`, `shop-status` |
| EVENT 04 (service engaged) | `queue.engaged` | `queue-token-{TOKEN}`, `shop-status` |
| EVENT 05 (service complete) | `queue.completed` | `shop-status`, `cashier` |
| EVENT 06 (payment intent) | `payment.ready` | `queue-token-{TOKEN}` |
| EVENT 08 (payment settled) | `payment.settled` | `queue-token-{TOKEN}`, `cashier`, `shop-status` |
| EVENT 25 (reservation expired) | `queue.expired` | `shop-status`, `cashier` |

### 11.4 Pusher Fallback (SMS / Telegram)

For customers who close the tracking page tab, in-app Pusher obviously cannot reach them. In this case only, an SMS or Telegram message is sent as fallback:

- Trigger: `EVENT 03 — CUSTOMER_CALLED_TO_CHAIR` + customer has no active Pusher subscription on their channel
- Message: "It's your turn at Uncle Grooming Hub! Ticket A-07. Come to Dawit's chair now."
- Channel: Telegram if handle provided, SMS if phone number only

The fallback is best-effort. The in-app experience is primary.

### 11.5 Pusher Client in Next.js

```typescript
// src/core/realtime/pusher.client.ts
import Pusher from 'pusher-js';

export const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
});

// src/ui/hooks/usePusher.ts
export function usePusherChannel(channelName: string) {
  useEffect(() => {
    const channel = pusherClient.subscribe(channelName);
    return () => { pusherClient.unsubscribe(channelName); };
  }, [channelName]);
  
  return {
    on: (event: string, callback: (data: unknown) => void) =>
      pusherClient.channel(channelName)?.bind(event, callback),
  };
}
```

Server side: use `pusher` npm package to trigger events after each `commitEvent()` in the API route. Pusher free tier: 200k messages/day, 100 simultaneous connections — sufficient for a single-shop deployment.

---

## 12. Operational Screen Shell (Updated)

All operational screens use this structure:

```tsx
// Correct shell — prevents overflow, fills viewport exactly
<div style={{
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100dvh",
  overflow: "hidden",
  background: "var(--bg-base)",
}}>
  <TopBar />   {/* flex-shrink: 0, height: 56px */}
  <main style={{
    flex: 1,
    minHeight: 0,        // critical — allows flex child to scroll
    overflowY: "auto",
    padding: "16px",     // 24px on desktop via media query
  }}>
    {/* screen content */}
  </main>
</div>
```

TopBar contents (left to right):
1. Role badge — color-coded pill (BARBER: green, CASHIER: blue, ADMIN: gold)
2. Screen name
3. Flex spacer
4. `<SyncIndicator />`
5. Logout / menu button

No sidebar on mobile. Admin sidebar is a drawer on mobile only.

---

## 13. PIN Entry — Login Alternate Flow

When a PIN-based fallback is needed (e.g., quick re-authentication mid-session without full logout), a 6-digit PIN pad appears as a modal overlay. This is NOT the primary login screen — that uses username + password.

```
6 boxes layout:  [ ] [ ] [ ] [ ] [ ] [ ]
Mobile size:     min(52px, 13vw) × min(64px, 16vw) each — never overflow
Desktop size:    60×72px each
Gap:             8px (mobile), 10px (desktop)
Border-radius:   10px
```

Input managed via hidden `<input type="tel">` for mobile keyboard. Boxes are visual only.  
On very small screens (<360px): reduce box size to `44×56px` minimum.

---

## 14. Animation Standards

### Scroll Reveal (Public pages only)

```tsx
<AnimateIn delay={0}>    {/* first element */}
<AnimateIn delay={0.1}>  {/* second */}
<AnimateIn delay={0.2}>  {/* third */}
{/* Never stagger more than 4 items. Max delay: 0.4s */}
```

Settings: `y: 32, duration: 0.7, ease: [0.16, 1, 0.3, 1]`

### Operational Screen Transitions

```tsx
// Queue entry appearing
initial={{ opacity: 0, x: -16 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, x: 16 }}
transition={{ duration: 0.25, ease: "easeOut" }}

// Bottom sheet open (mobile action panel)
initial={{ y: "100%" }}
animate={{ y: 0 }}
exit={{ y: "100%" }}
transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}

// Toast notification
initial={{ opacity: 0, y: -16 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -8 }}
transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}

// Modal/panel open
initial={{ opacity: 0, y: 16 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: 8 }}
transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
```

### Rules — What Causes Jank

- Animate `margin`, `padding`, `width`, `height` → use `transform` and `opacity` only
- Multiple `setInterval` timers in one component → use a single timer in a shared service
- `overflow: hidden` on animated containers → use `clip-path` or `transform` instead
- Large images without `loading="lazy"` and explicit dimensions
- Missing `will-change: transform` on heavy animated elements

---

## 15. Session State Contract (Updated)

After `EVENT 13 — OPERATOR_SESSION_OPENED`:

```typescript
interface ActiveSession {
  session_id:     string;   // UUID — in ALL event metadata
  actor_id:       string;   // Operator UUID
  role:           "BARBER" | "CASHIER" | "ADMIN" | "SYSTEM_OWNER";
  actor_name:     string;
  terminal_id:    string;
  opened_at:      string;   // HLC timestamp
  is_first_login: boolean;  // forces PIN change screen if true
}
```

- `sessionStorage` → clears on tab/browser close
- No session → redirect to `/login`
- Wrong role for screen → redirect to `/login`
- `/status`, `/reserve`, `/track/[token]` do NOT check session

---

## 16. Route Map (Updated)

```
/                  → <LandingPage />           Static SSR. No RuntimeProvider. No session.
/status            → <StatusBoardScreen />     RuntimeProvider. No session required.
/login             → <OperatorLoginScreen />   RuntimeProvider. No session check.
/cashier           → <CashierScreen />         RuntimeProvider. Session: CASHIER | ADMIN | SYSTEM_OWNER
/barber/[id]       → <BarberDashboardScreen /> RuntimeProvider. Session: BARBER
/settlement        → <SettlementScreen />      RuntimeProvider. Session: CASHIER | ADMIN | SYSTEM_OWNER
/admin             → <AdminScreen />           RuntimeProvider. Session: ADMIN | SYSTEM_OWNER
/reserve           → <ReserveScreen />         No RuntimeProvider. No session. Cloud API.
/track/[token]     → <CustomerTrackingPage />  No RuntimeProvider. No session. Pusher client.
/pay/[intent_id]   → <PaymentDashboard />      No RuntimeProvider. No session. Cloud API.
/setup/bootstrap   → <BootstrapScreen />       One-time only. Disabled after first use.
```

---

## 17. File & Code Standards

```
Naming:           PascalCase components, camelCase hooks/utils, kebab-case filenames
File header:      JSDoc @file and @module on every file
Section dividers: // ─── Section Name ─────────────────────────────────────────
Exports:          Named exports only (except Next.js page.tsx default exports)
Inline styles:    Use for all layout/color/sizing (reliable under Tailwind v4)
Tailwind:         Use ONLY for responsive prefixes (sm:, lg:) — never for color or spacing
CSS variables:    All color references use var(--name) — never raw hex in components
```

---

## 18. Accessibility & Performance

**Accessibility minimum:**
- All interactive elements have `aria-label` or visible text
- Focus rings: `outline: 2px solid var(--gold-primary); outline-offset: 2px`
- Color is never the ONLY indicator of state — always paired with text or icon
- Status board readable without color

**Performance targets:**
- UI interactions: < 100ms
- Optimistic feedback: immediate
- Images: WebP, explicit dimensions, `loading="lazy"` outside initial viewport
- Input font-size ≥ 16px everywhere (prevents iOS zoom)
- No horizontal scroll on any screen at any viewport width

**Lighthouse targets:**
- Landing page: 90+ Performance, 100 Accessibility
- Operational screens: 85+ Performance
- Customer tracking page: 90+ Performance (no RxDB, no heavy runtime)

---

*ui-standards.md v2.1 — Uncle Grooming Hub*  
*Supersedes v2.0. Nothing removed — only corrected and extended.*  
*Conflicts: AGENT.md wins. ECS v1.3 / TAS v1.0 win.*
