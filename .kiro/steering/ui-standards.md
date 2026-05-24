---
inclusion: auto
---

# Uncle Grooming Hub — UI Standards & Implementation Guide v2.0

**Authority:** This document governs every pixel, component, animation, and UI behavior.  
**Stack:** Next.js 16 (App Router), Tailwind v4, Framer Motion 11, RxDB 17  
**Read AGENT.md first. This document covers the visual and behavioral layer only.**

---

## 0. What UI Is and Is Not Allowed To Do

This is the most important section. UI components are dumb renderers of projection output.

**UI MAY:**
- Call hooks from `src/ui/hooks/` and render their output
- Call action creators from `src/core/actions/` in response to user gestures
- Hold ephemeral UI state: modal open/closed, input field value, hover state, loading spinner
- Show optimistic feedback (greyed-out entry, spinner) after dispatching an action
- Redirect to `/login` when `useSession()` returns null

**UI MUST NOT:**
- Import from `src/core/journal/`, `src/core/db/`, or `src/core/projection/` directly
- Call `commitEvent()` directly
- Compute durations, wait times, queue positions, totals, or any domain value
- Hold domain data in `useState` (queue entries, barber states, transactions)
- Call `Date.now()` or `new Date()` for any ordering or business logic
- Make `fetch()` calls (exception: `/reserve` may call Cloud reservation API)

---

## 1. Design Language

The aesthetic is **Cinema Dark** — premium, focused, low-friction. Think: a luxury barbershop at 11pm. High contrast. Minimal chrome. Gold accents that earn their place. Information that surfaces only when needed.

**Character:** Serious. Warm. Precise. Never playful. Never corporate.

**What makes this unforgettable:** The gold is not decoration — it is signal. Every gold element means "this is actionable" or "this is the most important thing here." Everything else recedes into charcoal.

---

## 2. Typography

**Font stack:** `'Geist', 'DM Sans', system-ui, sans-serif`  
Use `next/font` for Geist (already available in Next.js 15+). Fall back to DM Sans for numbers-heavy displays.

Use `clamp()` for all headings. Never use fixed large sizes like `text-7xl` or `text-8xl` — they break mobile.

```
Display (hero only):  clamp(36px, 6vw, 64px)    font-weight: 900
H1 (page title):      clamp(28px, 4vw, 48px)    font-weight: 900
H2 (section title):   clamp(22px, 3vw, 36px)    font-weight: 800
H3 (card title):      clamp(16px, 2vw, 20px)    font-weight: 700
Body large:           16px / line-height: 1.7
Body base:            14px / line-height: 1.6
Body small:           13px / line-height: 1.5
Label/eyebrow:        11px / tracking: 0.15em / uppercase / weight: 700
Caption:              12px / color: rgba(255,255,255,0.4)
Mono (HLC, IDs):      13px / font-family: 'Geist Mono', monospace
```

**Eyebrow labels** (e.g. "The Menu", "Queue Status", "Your Lane"):
- Always: 11px, uppercase, letter-spacing: 0.15em, color: `#e2d609`
- Always displayed ABOVE the heading it labels
- Never on buttons. Never in running text.

**Bilingual rule (Amharic/English):** All operational text must support both. Amharic at same font size. Use `lang="am"` attribute on Amharic spans. Toggle persisted in `localStorage` key `lang_preference`.

---

## 3. Color System

All colors defined as CSS variables in `globals.css`. Never hardcode hex values in component files — reference variables.

```css
:root {
  /* Backgrounds */
  --bg-base:       #0f1317;   /* Primary background — odd sections, screen bg */
  --bg-surface:    #171d22;   /* Secondary — topbar, even sections */
  --bg-card:       #1e262d;   /* Cards, panels, list rows */
  --bg-input:      #252f38;   /* Input fields, PIN boxes */
  --bg-hover:      #242e37;   /* Row hover state */

  /* Borders */
  --border:        #2d3840;   /* Default border */
  --border-focus:  #e2d609;   /* Active input border */
  --border-subtle: #1e262d;   /* Dividers within cards */

  /* Gold — Signal Colors */
  --gold-primary:  #e2d609;   /* Buttons, active states, highlights, eyebrows */
  --gold-secondary:#c9973a;   /* Subtle accents, secondary badges */
  --gold-glow:     rgba(226, 214, 9, 0.15);  /* Glow behind active elements */
  --gold-glow-lg:  rgba(226, 214, 9, 0.25);  /* Larger glow — CTA buttons */

  /* Text */
  --text-primary:  #f5f5f5;
  --text-secondary:rgba(255,255,255,0.6);
  --text-muted:    rgba(255,255,255,0.4);
  --text-disabled: rgba(255,255,255,0.25);
  --text-gold:     #e2d609;

  /* State Colors */
  --state-waiting:  #3b82f6;  /* Blue — customer waiting */
  --state-called:   #f59e0b;  /* Amber — customer called */
  --state-engaged:  #10b981;  /* Green — service in progress */
  --state-settled:  #6366f1;  /* Indigo — payment settled */
  --state-expired:  #6b7280;  /* Grey — expired/cancelled */
  --state-error:    #ef4444;  /* Red — error, failure */
  --state-reserved: #8b5cf6;  /* Purple — remote reservation */

  /* Sync Status */
  --sync-local:     #f59e0b;  /* Amber — local only, not synced */
  --sync-sending:   #3b82f6;  /* Blue — transmitting */
  --sync-verified:  #10b981;  /* Green — cloud verified */
}
```

**Section backgrounds alternate:**
- Odd sections: `var(--bg-base)` `#0f1317`
- Even sections: `var(--bg-surface)` `#171d22`

Section boundary: `border-top: 1px solid var(--border)`

---

## 4. Spacing System

All spacing on an 8pt grid. No half-pixel values.

```
Section vertical padding:   80px top/bottom   (mobile: 56px)
Section horizontal padding: 24px              (desktop: 48px)
Inner container:            max-width: 1280px; margin: 0 auto
Card padding:               20px–24px
Gap between cards:          16px–20px
Heading → body gap:         16px
Body → CTA gap:             32px
TopBar height:              56px
Operational content pad:    20px 16px (mobile), 24px (desktop)
```

Every section MUST have `max-width: 1280px; margin: 0 auto` on its inner wrapper.

---

## 5. Component Library

### 5.1 — Buttons

Three types. Use inline styles for reliability under Tailwind v4. Never use Tailwind classes for button styling.

```tsx
// PRIMARY — gold filled — for the main action on any screen
style={{
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
  padding: "13px 28px", borderRadius: "9999px",
  background: "var(--gold-primary)", color: "#0f1317",
  fontSize: "14px", fontWeight: 800, letterSpacing: "0.02em",
  border: "none", cursor: "pointer",
  boxShadow: "0 0 24px var(--gold-glow-lg)",
  transition: "all 0.2s ease",
}}
// Hover: boxShadow: "0 0 32px rgba(226,214,9,0.4)", transform: "translateY(-1px)"
// Disabled: opacity: 0.4, cursor: "not-allowed", boxShadow: "none"

// SECONDARY — outlined gold — for secondary or confirmatory actions
style={{
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
  padding: "12px 28px", borderRadius: "9999px",
  background: "transparent", color: "var(--gold-primary)",
  fontSize: "14px", fontWeight: 700,
  border: "2px solid var(--gold-primary)", cursor: "pointer",
  transition: "all 0.2s ease",
}}
// Hover: background: "rgba(226,214,9,0.08)"

// GHOST — minimal — for tertiary, cancel, close actions
style={{
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
  padding: "12px 28px", borderRadius: "9999px",
  background: "transparent", color: "var(--text-secondary)",
  fontSize: "14px", fontWeight: 600,
  border: "1px solid var(--border)", cursor: "pointer",
  transition: "all 0.2s ease",
}}

// DANGER — for destructive actions that require confirmation
style={{
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
  padding: "12px 28px", borderRadius: "9999px",
  background: "transparent", color: "var(--state-error)",
  fontSize: "14px", fontWeight: 700,
  border: "2px solid var(--state-error)", cursor: "pointer",
  transition: "all 0.2s ease",
}}
```

**Button rules:**
- One PRIMARY button per screen section maximum
- Destructive actions (cancel, delete) always use DANGER + confirmation dialog
- Disabled state must be visually distinct (opacity 0.4) AND have `disabled` attribute
- Loading state: spinner replaces label, button remains same size

### 5.2 — Cards

```tsx
// Standard operational card
style={{
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "20px",
}}

// Active/selected card (e.g. barber lane currently engaged)
style={{
  background: "var(--bg-card)",
  border: "1px solid var(--gold-primary)",
  borderRadius: "12px",
  padding: "20px",
  boxShadow: "0 0 0 1px var(--gold-primary), 0 0 20px var(--gold-glow)",
}}

// Queue entry row (in list, not standalone card)
style={{
  background: "var(--bg-card)",
  borderBottom: "1px solid var(--border-subtle)",
  padding: "16px 20px",
  transition: "background 0.15s ease",
}}
// Hover: background: "var(--bg-hover)"
```

### 5.3 — Status Badges

Status badges MUST use the `--state-*` variables. Never freeform colors.

```tsx
// Pattern for all badges
const badgeStyle = (status: QueueStatus) => ({
  display: "inline-flex", alignItems: "center", gap: "6px",
  padding: "4px 10px", borderRadius: "9999px",
  fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  background: stateColor(status, 0.15),
  color: stateColor(status, 1),
  border: `1px solid ${stateColor(status, 0.3)}`,
})

function stateColor(status: string, alpha: number): string {
  const map: Record<string, string> = {
    WAITING:  `rgba(59, 130, 246, ${alpha})`,
    CALLED:   `rgba(245, 158, 11, ${alpha})`,
    IN_SERVICE: `rgba(16, 185, 129, ${alpha})`,
    SETTLED:  `rgba(99, 102, 241, ${alpha})`,
    EXPIRED:  `rgba(107, 114, 128, ${alpha})`,
    RESERVED: `rgba(139, 92, 246, ${alpha})`,
    ERROR:    `rgba(239, 68, 68, ${alpha})`,
  };
  return map[status] ?? `rgba(107, 114, 128, ${alpha})`;
}
```

### 5.4 — Sync Indicator

Every operational screen MUST display sync status. It lives in the TopBar.

```tsx
// Three visual states — must be immediately readable at a glance
// LOCAL (amber dot, pulsing): "Saved locally"
// SENDING (blue dot, spinning): "Syncing..."
// VERIFIED (green dot, static): "Cloud verified"

// Implementation: useSyncStatus() hook → SyncIndicator component
// Dot: 8px circle. Text: 11px, var(--text-muted). Never intrusive.
```

### 5.5 — Inputs

```tsx
// Text input
style={{
  width: "100%", padding: "12px 16px",
  background: "var(--bg-input)", border: "1px solid var(--border)",
  borderRadius: "10px", color: "var(--text-primary)",
  fontSize: "15px", outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
}}
// Focus: borderColor: "var(--border-focus)", boxShadow: "0 0 0 3px var(--gold-glow)"

// Label
style={{
  fontSize: "12px", fontWeight: 600,
  color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: "0.08em",
  marginBottom: "6px", display: "block",
}}

// Error state
style={{ borderColor: "var(--state-error)", boxShadow: "0 0 0 3px rgba(239,68,68,0.15)" }}
// Error message: 12px, var(--state-error), margin-top: 4px
```

---

## 6. Operational Screen Shell

All operational screens (Login, Cashier, Barber, Settlement, Admin) use this exact layout.

```
┌──────────────────────────────────────────────┐
│  TopBar                                       │  height: 56px
│  [Role Badge] [Screen Title]  [Sync] [Logout] │  bg: var(--bg-surface)
│                                               │  border-bottom: 1px solid var(--border)
├──────────────────────────────────────────────┤
│                                               │
│  Main Content Area                            │  flex: 1, overflow-y: auto
│  padding: 20px 16px (mobile)                  │  bg: var(--bg-base)
│  padding: 24px (desktop)                      │
│                                               │
└──────────────────────────────────────────────┘
```

**TopBar contents (left to right):**
1. Role badge — pill shape, color-coded by role:
   - CASHIER: `background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3)`
   - BARBER: `background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3)`
   - ADMIN: `background: rgba(226,214,9,0.15); color: #e2d609; border: 1px solid rgba(226,214,9,0.3)`
2. Screen name (H3 size, var(--text-primary))
3. Spacer (flex: 1)
4. `<SyncIndicator />` — always visible
5. Logout button — GHOST style, 36px height

**No sidebar on mobile. Admin screen MAY have sidebar at ≥1024px only.**  
**No bottom navigation bar. All navigation via TopBar or explicit action buttons.**

---

## 7. Screen-Specific UI Contracts

### 7.1 — Operator Login (`/login`)

**Purpose:** PIN entry gate. Zero friction. One job.

**Layout:** Centered vertically and horizontally. Logo + "Uncle Grooming Hub" above. PIN boxes below. Role selector below PIN if needed.

**PIN boxes — 6 digits:**
- Mobile: 52×64px each. Desktop: 60×72px each.
- Gap between boxes: 8px
- Empty box: `background: var(--bg-input); border: 1px solid var(--border)`
- Active box: `border-color: var(--gold-primary); box-shadow: 0 0 0 3px var(--gold-glow)`
- Filled box: `background: var(--bg-input); color: var(--text-primary)` — show dot, not digit
- Error: `border-color: var(--state-error); box-shadow: 0 0 0 3px rgba(239,68,68,0.15)` + CSS shake (not Framer)
- Success: all boxes gold background, 400ms hold, then navigate to role screen

**Shake keyframe (globals.css):**
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
}
.shake { animation: shake 0.4s ease; }
```

**No keyboard shown on desktop → real keyboard works. On mobile → show numpad UI.**

### 7.2 — Cashier Screen (`/cashier`)

**Two-panel layout on desktop (≥1024px): Queue list (left, 60%) + Action panel (right, 40%)**  
**Single column on mobile: Queue list, action panel below**

**Queue list:**
- Sorted by HLC arrival time — first in, first out
- Each entry shows: Position number, customer initials, preferred barber name, service intent count, wait time estimate, status badge
- Tapping an entry opens the action panel for that customer
- RESERVED entries (purple badge) appear at top in their own section
- "No-show" expiry countdown shows for CALLED entries approaching grace window

**Action panel:**
- "Check In New Customer" form: name, barber preference, service intents
- For selected existing entry: "Call to Chair", "Update Intents", "Cancel"
- "Call to Chair" button is PRIMARY gold — most important action
- "Call to Chair" is DISABLED if preferred barber is not AVAILABLE (per preference sovereignty)
- Show "Transfer?" prompt if preferred barber unavailable and another is free — requires consent EVENT 12

**Intent list:**
- Chips/tags showing selected services
- + / - icons to add/remove (disabled after EVENT 04)
- Shows estimated total duration next to the list

### 7.3 — Barber Dashboard (`/barber/[id]`)

**Full-screen "cockpit" for a single barber. Minimal. Decisive.**

**States:**

AVAILABLE state:
- Large centered status: gold dot + "Ready" in H2
- "Go on Break" button (GHOST)
- Upcoming client info if CALLED state is next

CALLED state (customer en route):
- Customer name prominent
- Service intents list (can still edit — not locked yet)
- "Start Service" button — PRIMARY, large, prominent
- Timer showing how long since call

IN_SERVICE state:
- Customer name + services locked (read-only)
- Running timer since `EVENT 04` HLC
- "Complete Service" button — PRIMARY gold
- No other actions available (interruption avoidance rule — PRD §13.3)

**Personal tip earnings:**
- Subtle card at bottom: "Today's Tips" — single ETB number
- No comparison to other barbers. No shop revenue. Barber sees only their own.

**Schedule tab:**
- Recurring weekly schedule grid (Mon–Sun, on/off per day with hours)
- "Update Schedule" saves EVENT 23
- Clearly labeled "These are your default hours. Shop hours override these."

### 7.4 — Settlement Screen (`/settlement`)

**Transaction-focused. Financial clarity.**

**Transaction list:**
- Only PAYMENT_PENDING and PROCESSING transactions
- Each shows: customer initials, barber, services, total, elapsed time in PAYMENT_PENDING

**Selected transaction panel:**
- Service itemization (read-only — locked at EVENT 04)
- Base price (bold)
- Tip amount (if any, customer-entered)
- Total (larger, gold)
- "Confirm Cash" button → triggers settlement request to cloud
- "Digital Payment" QR code display (generated from payment intent)
- Status: LOCAL_ONLY / TRANSMITTING / CLOUD_VERIFIED

**Completed transactions:**
- Move to "Today's Completed" section immediately on SETTLED
- Show green SETTLED badge with verified checkmark

### 7.5 — Admin Screen (`/admin`)

**Admin has sidebar on desktop (≥1024px). Four sections:**

1. **Audit Log** — HLC-ordered event stream. Filterable by event type, barber, date. Read-only. Append Adjustment button opens correction form → EVENT 09
2. **Shop Configuration** — Operating hours override (EVENT 24). Price registry view (read-only — prices locked in spec, edits via correction entry).
3. **Sync Health** — All terminals, sync status, bytes pending, last ACK time.
4. **Quality Alerts** — Feedback threshold violations from PRD §8.3. Read-only. Flags for review.

### 7.6 — Status Board (`/status`)

**Designed to run on a large screen (TV, monitor) visible to customers in the shop.**

**Full-screen. No controls. No interaction required.**

**Two-column layout:**
- Left column: "Now Serving" — barber lanes with current customer (initials only) and status
- Right column: "Waiting" — queue entries in order, initials only, estimated wait

**Design rules for status board:**
- Font sizes larger than operational screens (display size)
- High contrast — readable from 5 meters
- Auto-refreshes from `useQueueBoard()` and `useBarberLane()` — no manual refresh
- MUST NOT show: financial data, full names, loyalty tier, tip amounts
- MUST NOT have any interactive elements (buttons, inputs)
- Shows subtle "Local Mode" indicator (top-right, 12px amber text) when sync is offline
- Bilingual toggle button (only UI element on screen) — switches all text EN/AM

---

## 8. Animation Standards

### Scroll Reveal (Public pages only)

Use `AnimateIn` from `@/ui/components/public/AnimateIn`:

```tsx
<AnimateIn delay={0}>    {/* first element */}
<AnimateIn delay={0.1}>  {/* second */}
<AnimateIn delay={0.2}>  {/* third */}
{/* Never stagger more than 4 items. Max delay: 0.4s */}
```

Settings: `y: 32, duration: 0.7, ease: [0.16, 1, 0.3, 1]` (expo-out)

### Operational Screen Transitions

Use `AnimatePresence` for any conditional content (panels, modals, toasts).

```tsx
// Queue entry appearing
initial={{ opacity: 0, x: -16 }}
animate={{ opacity: 1, x: 0 }}
exit={{ opacity: 0, x: 16 }}
transition={{ duration: 0.25, ease: "easeOut" }}

// Status change (badge color shift)
transition={{ duration: 0.2 }}  // color only — CSS transition is fine

// Modal/panel open
initial={{ opacity: 0, y: 16 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: 8 }}
transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
```

### Rules — What Causes Jank (Never Do This)

- Animate `margin`, `padding`, `width`, `height` → use `transform` and `opacity` only
- Multiple `setInterval` timers in one component → use a single timer in a shared service
- `overflow: hidden` on animated containers → use `clip-path` or `transform` instead
- Large images without `loading="lazy"` and explicit dimensions
- Missing `will-change: transform` on heavy animated elements (status board ticker)

---

## 9. Mobile-First Rules

Every layout starts single-column and expands upward.

```
Mobile  (default, <640px): Single column. 56px vertical padding. 24px horizontal.
Tablet  (≥640px):           2 columns where layout benefits from it.
Desktop (≥1024px):          Final layout. Sidebar for Admin. Split panels for Cashier.
```

**Touch targets:** Minimum 44×44px for any tappable element. Queue entry rows must be at least 60px tall on mobile.

**Responsive heading strategy:**
- Hero: `clamp(36px, 6vw, 64px)` — never exceed
- H1: `clamp(28px, 4vw, 48px)`
- H2: `clamp(22px, 3vw, 36px)`

**Operational screens on mobile:**
- TopBar collapses role badge to icon-only below 400px
- Action panel becomes a bottom sheet (slides up) on mobile instead of right panel
- PIN boxes stack 3+3 on very small screens (< 360px)

---

## 10. PIN Entry — Login Screen Spec

```
6 boxes layout:  [ ] [ ] [ ] [ ] [ ] [ ]
Mobile size:     52×64px each, 8px gap
Desktop size:    60×72px each, 10px gap
Border-radius:   10px
```

States:
- **Empty:** `bg: var(--bg-input)`, `border: 1px solid var(--border)`
- **Active (cursor here):** `border: 1px solid var(--gold-primary)`, `box-shadow: 0 0 0 3px var(--gold-glow)`
- **Filled:** `bg: var(--bg-input)`, show `●` dot at 20px, `color: var(--text-primary)`
- **Error:** `border: 1px solid var(--state-error)`, `box-shadow: 0 0 0 3px rgba(239,68,68,0.15)`, trigger `.shake` CSS class
- **Success:** all boxes `bg: var(--gold-primary)`, `color: #0f1317`, hold 400ms, then navigate

Input is managed via a hidden `<input type="tel">` element for mobile keyboard support. Boxes are purely visual.

---

## 11. Session State Contract

After `EVENT 13 — OPERATOR_SESSION_OPENED`, session lives in `sessionStorage`:

```typescript
interface ActiveSession {
  session_id:  string;   // UUID — included in ALL event metadata
  actor_id:    string;   // Operator UUID
  role:        "BARBER" | "CASHIER" | "ADMIN";
  actor_name:  string;
  terminal_id: string;   // From terminalIdentity.getId()
  opened_at:   string;   // HLC timestamp
}
```

- `sessionStorage` → clears on tab/browser close (intentional — shared terminal security)
- No active session → redirect to `/login` (handled by `RuntimeProvider`)
- Wrong role for screen → redirect to `/login`
- `/status` and `/reserve` do NOT check session

---

## 12. File & Code Standards

```
Naming:           PascalCase components, camelCase hooks/utils, kebab-case filenames
File header:      JSDoc @file and @module on every file
Section dividers: // ─── Section Name ─────────────────────────────────────────
Exports:          Named exports only (except Next.js page.tsx default exports)
Inline styles:    Use for all layout/color/sizing (reliable under Tailwind v4)
Tailwind:         Use ONLY for responsive prefixes (sm:, lg:) — never for color or spacing
CSS variables:    All color references use var(--name) — never raw hex in components
```

**The one exception to inline styles:** `globals.css` may define keyframe animations, `@font-face`, scroll-behavior, and CSS reset rules.

---

## 13. Route Map

```
/              → <LandingPage />          Static SSR. No RuntimeProvider. No session.
/status        → <StatusBoardScreen />    RuntimeProvider required. No session required.
/login         → <OperatorLoginScreen />  RuntimeProvider required. No session check.
/cashier       → <CashierScreen />        RuntimeProvider required. Session: CASHIER | ADMIN
/barber/[id]   → <BarberDashboardScreen/> RuntimeProvider required. Session: BARBER
/settlement    → <SettlementScreen />     RuntimeProvider required. Session: CASHIER | ADMIN
/admin         → <AdminScreen />          RuntimeProvider required. Session: ADMIN only
/reserve       → <ReserveScreen />        No RuntimeProvider. No session. Cloud API only.
```

**Page.tsx files contain NOTHING except:**
```tsx
// src/app/cashier/page.tsx
export default function CashierPage() {
  return <CashierScreen />;
}
```

All logic lives in the screen component, not the page.

---

## 14. Accessibility & Performance

**Accessibility minimum:**
- All interactive elements have `aria-label` or visible text
- Focus rings visible — override browser default with `outline: 2px solid var(--gold-primary); outline-offset: 2px`
- Color is never the ONLY indicator of state — always paired with text or icon
- Status board readable without color (use shapes + text, not color alone)

**Performance targets (from PRD §11.1):**
- UI interactions: < 100ms response (no blocking operations in event handlers)
- Optimistic feedback: immediate (before journal write confirms)
- Image assets: WebP, explicit dimensions, `loading="lazy"` outside initial viewport
- Bundle: no client-side imports that pull in server-only modules
- Status board: must stay smooth at 60fps — no heavy recalculations in render

**Lighthouse targets:**
- Landing page: 90+ Performance, 100 Accessibility
- Operational screens: 85+ Performance (RxDB has startup cost)

---

*ui-standards.md v2.0 — Uncle Grooming Hub*  
*Any conflict with AGENT.md: AGENT.md wins.*  
*Any conflict with ECS v1.3 / TAS v1.0: spec documents win.*
