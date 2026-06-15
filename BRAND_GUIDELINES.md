# BRAND GUIDELINES — NULL: Visual Identity & Design System

## 0. How to Use This Document

This document defines the visual identity, design tokens, component conventions, and tone of voice for **NULL**, the Zero Trust Network Access platform described in `SYSTEM_INSTRUCTIONS.md`. Apply these rules to every page, component, and piece of UI copy produced for the project. Where `SYSTEM_INSTRUCTIONS.md` defines *what* to build, this document defines *how it should look, feel, and read*.

Implement these tokens as a Tailwind CSS configuration (custom colors, font families, spacing/radius scale) plus a small set of shared React components (Button, Card, Badge, Table, Modal, NavBar, Sidebar, FormField, StatCard, Toast) that every page reuses. Do not restyle these primitives per-page.

---

## 1. Brand Concept

**NULL is named for what an attacker should find: nothing.** No implicit trust, no standing access, no assumptions. The visual identity should feel like a **security operations console** — precise, calm, slightly clinical, built for people who make access decisions under pressure. It should never feel playful, "startup-SaaS-pastel," or decorative.

**Design direction:** dark operational console as the primary surface, with a single cold cyan-green signal color reserved for verified/active/safe states, and a hard amber/red reserved strictly for warnings and denials. Typography pairs a technical monospace (for IDs, tokens, fingerprints, timestamps, logs — anything that is literally data) with a clean geometric sans (for UI labels, navigation, and prose). This pairing itself is the signature: **every piece of "system truth" (an ID, a hash, a status code, a timestamp) is set in mono; every piece of human interface language is set in sans.** This typographic split visually reinforces the Zero Trust idea that the system deals in verifiable facts, not assumptions.

Avoid: rounded "friendly" illustrations, gradients used decoratively, generic shield/lock clip-art icons, bright multi-color palettes, drop shadows used heavily, light-mode-only design.

---

## 2. Color Palette

Primary surface is **dark mode by default** (this is a console, used for monitoring). A light theme is optional/secondary and not required for the MVP — if implemented, invert surfaces only, keep the accent colors identical.

| Token | Hex | Usage |
|---|---|---|
| `--null-bg` | `#0B0F12` | App background (near-black, slightly blue-green undertone) |
| `--null-surface` | `#11171B` | Cards, panels, sidebar |
| `--null-surface-raised` | `#161D22` | Modals, dropdowns, table headers |
| `--null-border` | `#23303A` | Hairline borders, dividers, table row separators |
| `--null-text-primary` | `#E6EEF1` | Primary text on dark surfaces |
| `--null-text-muted` | `#7E8C93` | Secondary text, placeholders, captions |
| `--null-signal` | `#3DF2C4` | Primary accent — verified/trusted/active/granted states, primary buttons, focus rings |
| `--null-signal-dim` | `#1E5C4D` | Signal color at low emphasis (badges background, subtle highlights) |
| `--null-warn` | `#F2B53D` | Warnings, pending states (e.g., device "pending" trust) |
| `--null-deny` | `#F2543D` | Denials, errors, revoked devices, failed logins |
| `--null-deny-dim` | `#3D2420` | Denial color background for badges/rows |
| `--null-info` | `#3D9DF2` | Informational accents, links, secondary actions |

### Usage rules
- `--null-signal` (cyan-green) is used **only** to indicate a positive Zero Trust outcome: access granted, device trusted, session active, 2FA verified, policy satisfied. It must never be used as a generic "brand color" decoration — its meaning must stay tied to "verified."
- `--null-deny` (red) is used **only** for denials, failures, and revocations — including the visible RBAC "access denied" state, failed login banners, revoked device badges, and audit log entries for blocked attempts.
- `--null-warn` (amber) is used for "pending" / "not yet verified" states — e.g., a newly registered device awaiting admin approval, or a session nearing expiry.
- Never use red/green/amber for purely decorative purposes (e.g., chart colors unrelated to trust status should use `--null-info` and neutral grays instead).

---

## 3. Typography

| Role | Typeface | Fallback stack | Usage |
|---|---|---|---|
| **Display / UI Sans** | Space Grotesk | `"Space Grotesk", "Inter", system-ui, sans-serif` | Page titles, nav labels, buttons, body copy, form labels |
| **Mono / Data** | JetBrains Mono | `"JetBrains Mono", "IBM Plex Mono", monospace` | User IDs, device fingerprints, JWT tokens, IPs, timestamps, role codes, table cell values that represent raw data, log entries |

Load both via Google Fonts or self-hosted woff2 in `index.html` / Tailwind config.

### Type scale (Tailwind-style)
- `text-xs` (12px) — table meta, captions, log timestamps (mono)
- `text-sm` (14px) — body text, form inputs, table cell text
- `text-base` (16px) — default body
- `text-lg` (18px) — card titles, section headers
- `text-2xl` (24px) — page titles
- `text-3xl` (30px) — dashboard hero stats (e.g., "active sessions" count) — use mono for the number itself, sans for the label

### Rule of thumb
If a value could be copy-pasted into a terminal or a database query (an ID, hash, token, timestamp, IP, status enum like `trusted`/`pending`/`revoked`), render it in **JetBrains Mono**, typically at a slightly smaller size and `text-muted` or accent color depending on its meaning. Everything a human wrote or a human reads as a sentence/label uses **Space Grotesk**.

---

## 4. Layout & Structure

### Overall shell
- Persistent left **Sidebar** (fixed width ~240px on desktop, collapsible on mobile) using `--null-surface` background, `--null-border` right border.
- Top-right of the shell shows: current user's name (sans), role badge (see Badges), and a small "session" indicator showing time-to-expiry in mono (e.g., `SESSION 14:32`), which visually reinforces continuous validation.
- Main content area on `--null-bg`, max content width ~1280px, generous padding (`p-6` to `p-8`).

### Sidebar navigation
- Grouped by the role-aware navigation: regular users see Dashboard / Access Request / Devices; Administrators additionally see a divider labeled `ADMIN` (small caps, mono, `text-muted`) followed by Users / Devices / Policies / Audit Logs.
- Active route indicated by a left-edge `--null-signal` bar (2-3px) plus brightened text — not a filled background block (keeps the console feel restrained).

### Grid & spacing
- 8px base spacing unit. Card padding `p-6`. Section gaps `gap-6` / `gap-8`.
- Border radius: small and consistent — `rounded-md` (6px) for cards/inputs/buttons. Avoid large rounded corners (`rounded-2xl`/`rounded-full`) except for status dots and avatars. This reinforces the precise/technical tone.

---

## 5. Components

### Buttons
- **Primary** (`Grant`, `Save`, `Approve`, `Log in`): `--null-signal` background, `--null-bg` text (dark text on bright signal color for contrast), `rounded-md`, `font-medium`, sans typeface, subtle 1px darker border. Hover: slight brightness increase, no large shadow.
- **Destructive** (`Revoke`, `Terminate Session`, `Delete User`): transparent background, `--null-deny` border and text; on hover, fill with `--null-deny-dim`.
- **Secondary/Ghost** (`Cancel`, navigation actions): transparent, `--null-border` border, `--null-text-muted` text, hover brightens to `--null-text-primary`.
- All buttons: `text-sm`, `px-4 py-2`, focus ring uses `--null-signal` at 40% opacity (`focus:ring-2 focus:ring-[--null-signal]/40`).

### Badges (for status enums — always mono, small caps)
- `trusted` / `active` / `granted` / `pass` → `--null-signal-dim` background, `--null-signal` text
- `pending` → `--null-warn` at low opacity background, `--null-warn` text
- `revoked` / `denied` / `terminated` / `fail` → `--null-deny-dim` background, `--null-deny` text
- Shape: `rounded-full px-2.5 py-0.5 text-xs font-mono uppercase tracking-wide`

### Cards
- `--null-surface` background, `--null-border` 1px border, `rounded-md`, `p-6`.
- Card title in Space Grotesk `text-lg font-semibold`; supporting metric or ID below in JetBrains Mono.

### StatCard (used on Admin Dashboard)
- Large number in JetBrains Mono `text-3xl`, label below in Space Grotesk `text-sm text-muted uppercase tracking-wide`.
- Example: `247` (mono, large) / `ACTIVE SESSIONS` (sans, small, muted, letter-spaced).
- Optional trend indicator using `--null-signal` (up/good) or `--null-deny` (up/bad, e.g., failed logins) — never both colors as decoration, only as meaning.

### Tables (Audit Logs, Users, Devices, Policies)
- Header row: `--null-surface-raised` background, Space Grotesk `text-xs uppercase tracking-wide text-muted`.
- Body rows: `--null-bg` or alternating very subtle `--null-surface`, 1px `--null-border` bottom divider, no vertical lines.
- Data cells (IDs, fingerprints, IPs, timestamps, tokens) in JetBrains Mono `text-sm`.
- Status/enum cells use Badges (Section above).
- Row hover: subtle `--null-surface-raised` background, no shadow/scale transforms.
- Long values (fingerprints, JWTs) should be truncated with `...` and a click-to-copy interaction (icon button), not wrapped.

### Forms (Login, Register, Policy editor, etc.)
- Inputs: `--null-surface` background, `--null-border` border, `rounded-md`, `px-3 py-2`, `text-sm`, Space Grotesk for labels and placeholders; if the field's *value* is technical (e.g., a device fingerprint display field), render the value in mono.
- Focus state: border becomes `--null-signal`, subtle glow via `box-shadow: 0 0 0 3px rgba(61,242,196,0.15)`.
- Validation error: border becomes `--null-deny`, helper text below in `--null-deny` `text-xs`.
- TOTP input: render as a row of individually-boxed digit cells (common authenticator-app pattern), each box `--null-surface`, mono font, center-aligned.

### Modals
- `--null-surface-raised` background, `--null-border` border, `rounded-md`, centered, max-width ~480px, backdrop `--null-bg` at 70% opacity with slight blur.
- Used for: confirm device revoke, confirm session termination, confirm user deletion — destructive confirmations should restate the consequence in plain language (see Voice & Tone).

### Access Decision Banner (Access Request page)
This is a **signature element** specific to NULL: when a user submits an access request, show a step-by-step "verification ladder" — six rows corresponding exactly to the six checks in the Security Model (Section 11 of `SYSTEM_INSTRUCTIONS.md`):

```
✓ User Authentication        PASS
✓ Two-Factor Authentication  PASS
✓ Device Verification        PASS
✓ Role Verification          PASS
✗ Policy Verification        FAIL  → "Employee role is not permitted for 'Admin Console'"
  Session Validation         SKIPPED
```

- Each row: check label in Space Grotesk, result in JetBrains Mono uppercase badge (PASS = signal, FAIL = deny, SKIPPED = muted gray).
- Rows after a failure are visually de-emphasized (`opacity-50`) and marked `SKIPPED`, since the pipeline short-circuits — this should visually teach the Zero Trust pipeline concept during a demo.
- Final outcome rendered as a large badge: `ACCESS GRANTED` (signal) or `ACCESS DENIED` (deny), Space Grotesk, bold, with the JetBrains Mono reason beneath it for denials.

---

## 6. Iconography

Use a single icon set throughout: **Lucide icons** (`lucide-react`), stroke-based, 1.5–2px stroke width, sized 16–20px in nav/buttons, 24px in stat cards. Recommended mappings:

| Concept | Icon |
|---|---|
| Dashboard | `LayoutDashboard` |
| Access Request | `KeyRound` |
| Devices | `Smartphone` / `MonitorSmartphone` |
| Users (admin) | `Users` |
| Policies | `ShieldCheck` |
| Audit Logs | `ScrollText` |
| Session / time | `Clock` |
| Trusted | `ShieldCheck` (signal color) |
| Pending | `ShieldQuestion` (warn color) |
| Revoked / Denied | `ShieldX` (deny color) |
| TOTP / 2FA | `KeySquare` |
| Logout | `LogOut` |

Do not use filled/solid icon styles, emoji, or photographic imagery anywhere in the product UI.

---

## 7. Voice & Tone (UI Copy)

NULL's interface speaks like a **calm, precise security system** — never cutesy, never apologetic, never vague.

- **Active voice, present tense.** "Access denied: device not recognized." not "Sorry, we couldn't verify your device this time."
- **State the reason, always.** Every denial (login failure, RBAC block, device rejection) must say *why* in one short clause, using the same vocabulary as the Security Model checklist (e.g., "Device Verification failed", "Policy Verification failed for role: Guest").
- **No exclamation marks, no emoji, no "Oops."**
- **Confirmations restate the action and its scope:** "Revoke this device? The user will be signed out and must re-register the device before next login." — not "Are you sure?"
- **Empty states are instructional, not cute:** Audit Logs with no entries yet → "No activity recorded yet. Events will appear here as users authenticate and request access." not "Nothing here! 🎉"
- **Labels name what the user controls**, not backend concepts: "Trust this device" not "Set device.trust_status = trusted".

### Sample copy reference
- Login button: `Log in`
- After password success, before TOTP: `Enter the 6-digit code from your authenticator app`
- Device pending: badge `PENDING` + helper text `Awaiting administrator approval`
- Access denied (RBAC): `Access denied — your role (Employee) does not have a policy for "Admin Console".`
- Session expiring soon (top bar): `Session expires in 02:14`
- Audit log activity strings should remain in the technical enum style already defined in `SYSTEM_INSTRUCTIONS.md` (e.g., `LOGIN_SUCCESS`, `DEVICE_UNRECOGNIZED`, `ACCESS_DENIED`) and rendered in mono — these are system truth, not UI copy, and should look like log lines.

---

## 8. Motion

Keep motion minimal and functional — this is a monitoring console, not a marketing site.

- Page transitions: none, or a 100ms opacity fade only.
- The Access Decision Banner (Section 5) may reveal its six verification rows sequentially with a ~80ms stagger per row, simulating the pipeline executing in real time — this is the one deliberate, meaningful animation in the product and should be used to teach the Zero Trust flow during demos.
- Hover states: color/border transitions only (`transition-colors duration-150`), no scale/translate transforms, no shadows that grow on hover.
- Respect `prefers-reduced-motion`: disable the staggered reveal and any transitions when set.

---

## 9. Accessibility & Responsiveness

- Maintain WCAG AA contrast: verify `--null-text-primary` on `--null-bg`/`--null-surface`, and `--null-signal`/`--null-deny`/`--null-warn` text against their "-dim" badge backgrounds.
- All interactive elements have visible focus states using the `--null-signal` focus ring described in Section 5.
- Sidebar collapses to a bottom or hamburger-triggered nav below `768px`. Tables become horizontally scrollable (not stacked) below `640px` — preserve mono alignment for data columns.
- All status information conveyed by color (badges) must also be conveyed by text (the enum label itself), satisfying color-blind accessibility — never rely on color alone.

---

## 10. Tailwind Configuration Reference

```js
// tailwind.config.js (extend block)
theme: {
  extend: {
    colors: {
      'null-bg': '#0B0F12',
      'null-surface': '#11171B',
      'null-surface-raised': '#161D22',
      'null-border': '#23303A',
      'null-text': '#E6EEF1',
      'null-muted': '#7E8C93',
      'null-signal': '#3DF2C4',
      'null-signal-dim': '#1E5C4D',
      'null-warn': '#F2B53D',
      'null-deny': '#F2543D',
      'null-deny-dim': '#3D2420',
      'null-info': '#3D9DF2',
    },
    fontFamily: {
      sans: ['"Space Grotesk"', '"Inter"', 'system-ui', 'sans-serif'],
      mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
    },
    borderRadius: {
      DEFAULT: '6px',
    },
  },
}
```

Apply `bg-null-bg text-null-text font-sans` to the root `<body>`/app shell. All data values (IDs, hashes, tokens, timestamps, IPs, status enums in logs) use `font-mono`.
