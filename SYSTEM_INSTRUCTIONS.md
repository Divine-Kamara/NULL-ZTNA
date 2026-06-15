# SYSTEM INSTRUCTIONS — NULL: Zero Trust Network Access Platform

## 0. Purpose of This Document

This document is the authoritative build specification for **NULL**, a web-based Zero Trust Network Access (ZTNA) platform. It is intended to be used directly by an AI development agent (Antigravity) to scaffold, implement, and wire together a complete full-stack prototype.

Read this document fully before writing any code. Follow it exactly. Where a decision is not specified here, choose the simplest option consistent with the architecture, security model, and tech stack defined below. Do not introduce additional frameworks, libraries, or architectural layers beyond what is specified unless strictly necessary to satisfy a requirement below.

A companion file, `BRAND_GUIDELINES.md`, defines the visual identity, design tokens, and UI/UX conventions for the frontend. Apply that document to all pages and components produced from this specification.

---

## 1. Project Overview

**System Name:** NULL
**Project Title:** Design and Implementation of a Zero Trust Network Access (ZTNA) Client for Secure Remote Access in Enterprise Environments

NULL is a web-based ZTNA platform that enforces the principle **"Never Trust, Always Verify."** Unlike traditional VPNs, which grant broad network trust after a single login, NULL re-evaluates trust on every access request by validating:

1. User identity (email + password)
2. A second authentication factor (TOTP / Google Authenticator)
3. Device identity and trust status (device fingerprint)
4. The user's assigned role (Administrator, Employee, Guest)
5. Applicable access policies for the requested resource
6. The validity and freshness of the current session (JWT)

Access is granted **only if all six checks pass**. If any check fails, the request must be denied and the event logged.

### System Objectives

1. Secure remote access to organizational resources.
2. Verify user identity before granting access.
3. Verify device identity before access approval.
4. Enforce role-based access control (RBAC) policies.
5. Continuously validate user sessions.
6. Monitor and log all security-relevant activity.
7. Demonstrate a practical, working implementation of Zero Trust principles suitable for SME environments.

---

## 2. Software Architecture

Build NULL as a **Modular Three-Tier Architecture**:

- **Presentation Layer** — React-based web client (SPA). Provides login, registration, dashboards, device management, policy management, and audit log views.
- **Application Layer** — Node.js + Express.js REST API. Implements all business logic: authentication, TOTP, device verification, RBAC, policy enforcement, session management, and audit logging. This layer is the single point through which every access decision passes.
- **Data Layer** — PostgreSQL database. Stores users, roles, devices, policies, sessions, and audit logs.

All communication between the Presentation Layer and Application Layer must occur over HTTPS via a RESTful JSON API. All communication between the Application Layer and Data Layer must use a secure, parameterized database connection (no raw string-concatenated SQL).

Each of the seven security/business services below must be implemented as a **distinct, independently testable module** within the backend (e.g., separate service files/folders), even though they share the same Express app and database:

1. Authentication Service
2. TOTP Verification Service
3. Device Verification Service
4. RBAC Service
5. Policy Enforcement Engine
6. Session Management Service
7. Audit Logging Service

---

## 3. Technology Stack (Mandatory — do not substitute)

### Frontend
- React.js (functional components + hooks)
- Vite (build tool/dev server)
- Tailwind CSS (styling — see `BRAND_GUIDELINES.md` for tokens)
- React Router (client-side routing)
- Axios (HTTP client for API communication)

### Backend
- Node.js
- Express.js (RESTful API)

### Database
- PostgreSQL

### Authentication & Security
- JSON Web Tokens (JWT) — session management
- Google Authenticator / TOTP (`otplib` or `speakeasy` for TOTP generation & verification, `qrcode` for enrollment QR codes)
- bcrypt — password hashing
- HTTPS (use a local/dev TLS certificate; document how to enable in production)
- helmet, cors, express-rate-limit (standard Express security middleware — acceptable additions as they directly support NFR1/NFR security goals)

### Dev Tooling
- GitHub (version control — initialize repo with sensible `.gitignore`)
- Postman collection (export an API collection covering all endpoints below)
- Environment variables via `.env` (never hardcode secrets)

---

## 4. User Roles

| Role | Description |
|---|---|
| **Administrator** | Full system access. Manages users, devices, roles, policies, sessions, and audit logs. Can access all internal resources. |
| **Employee** | Access limited to resources explicitly permitted by policies tied to the Employee role (e.g., "HR Portal"). |
| **Guest** | Minimal access. Can only access resources explicitly assigned via policy; default deny otherwise. |

Roles are stored in the `roles` table and referenced by `users.role_id`. Seed the database with these three roles on first run.

---

## 5. Database Design

Use PostgreSQL. Implement the following six tables exactly as specified, with primary keys, foreign keys, and constraints. Use `SERIAL` or `UUID` for IDs (prefer `SERIAL` integer IDs for simplicity unless otherwise noted). All passwords and TOTP secrets must never be stored in plaintext.

### 5.1 `roles`
| Column | Type | Notes |
|---|---|---|
| role_id | SERIAL PK | |
| role_name | VARCHAR(50) UNIQUE NOT NULL | "Administrator", "Employee", "Guest" |
| permissions | JSONB or TEXT | Free-form permission descriptors/tags |

### 5.2 `users`
| Column | Type | Notes |
|---|---|---|
| user_id | SERIAL PK | |
| full_name | VARCHAR(255) NOT NULL | |
| email | VARCHAR(255) UNIQUE NOT NULL | |
| password_hash | VARCHAR(255) NOT NULL | bcrypt hash |
| totp_secret | VARCHAR(255) NULL | base32 TOTP secret, set during 2FA enrollment |
| totp_enabled | BOOLEAN DEFAULT false | |
| role_id | INTEGER FK → roles.role_id NOT NULL | |
| status | VARCHAR(20) DEFAULT 'active' | 'active' / 'disabled' |
| created_at | TIMESTAMP DEFAULT now() | |

### 5.3 `devices`
| Column | Type | Notes |
|---|---|---|
| device_id | SERIAL PK | |
| user_id | INTEGER FK → users.user_id NOT NULL | |
| device_name | VARCHAR(255) | user-friendly label |
| device_fingerprint | VARCHAR(255) UNIQUE NOT NULL | hashed fingerprint string |
| trust_status | VARCHAR(20) DEFAULT 'pending' | 'pending' / 'trusted' / 'revoked' |
| registration_date | TIMESTAMP DEFAULT now() | |

### 5.4 `policies`
| Column | Type | Notes |
|---|---|---|
| policy_id | SERIAL PK | |
| role_id | INTEGER FK → roles.role_id NOT NULL | the role this policy applies to |
| resource_name | VARCHAR(255) NOT NULL | e.g. "HR Portal", "Admin Console" |
| access_condition | TEXT | free-text condition description, e.g. "trusted_device AND active_session" |

### 5.5 `sessions`
| Column | Type | Notes |
|---|---|---|
| session_id | SERIAL PK | |
| user_id | INTEGER FK → users.user_id NOT NULL | |
| token | TEXT NOT NULL | JWT string (or its hash) |
| login_time | TIMESTAMP DEFAULT now() | |
| expiry_time | TIMESTAMP NOT NULL | login_time + token TTL |
| status | VARCHAR(20) DEFAULT 'active' | 'active' / 'expired' / 'terminated' |

### 5.6 `audit_logs`
| Column | Type | Notes |
|---|---|---|
| log_id | SERIAL PK | |
| user_id | INTEGER FK → users.user_id NULL | nullable for failed-login attempts with unknown user |
| activity | VARCHAR(255) NOT NULL | e.g. "LOGIN_SUCCESS", "TOTP_FAIL", "DEVICE_UNRECOGNIZED", "ACCESS_DENIED" |
| ip_address | VARCHAR(45) | supports IPv4/IPv6 |
| timestamp | TIMESTAMP DEFAULT now() | |

### Relationships (enforce via FKs)
- One `role` → many `users`
- One `role` → many `policies`
- One `user` → many `devices`
- One `user` → many `sessions`
- One `user` → many `audit_logs`

Provide a SQL migration script (`schema.sql`) that creates all tables, FKs, and seed data (the three roles, and at least one seeded Administrator account for first login — credentials must be configurable via `.env`, never hardcoded in source).

---

## 6. Functional Requirements (Implement All)

| ID | Requirement |
|---|---|
| FR1 | Users can register and create accounts (full name, email, password). |
| FR2 | Users authenticate using email + password (bcrypt-verified). |
| FR3 | System supports TOTP verification via Google Authenticator (enrollment with QR code + ongoing verification). |
| FR4 | System generates a secure JWT after successful full authentication (password + TOTP + device check). |
| FR5 | System generates and registers a unique device fingerprint per device. |
| FR6 | System verifies a device is registered and trusted before granting access. |
| FR7 | Users are assigned to one of: Administrator, Employee, Guest. |
| FR8 | System enforces RBAC policies on every protected route. |
| FR9 | Authenticated users can request access to protected resources via an "Access Request" UI. |
| FR10 | System evaluates access requests against Zero Trust policies (role + device + session checks). |
| FR11 | Active sessions are continuously validated (JWT expiry + session status check on each request). |
| FR12 | Expired sessions are automatically terminated (marked 'expired'/'terminated' and rejected). |
| FR13 | All login attempts, TOTP results, device checks, and access events are written to `audit_logs`. |
| FR14 | Administrators have a dashboard to manage users, devices, roles, and policies. |
| FR15 | Administrators can view security monitoring data and activity/audit logs. |

---

## 7. Non-Functional Requirements

| ID | Requirement | Implementation Notes |
|---|---|---|
| NFR1 | Secure communication via HTTPS | Configure HTTPS for dev server; document cert setup |
| NFR2 | Acceptable auth/authorization response time | Avoid blocking operations; use async/await throughout |
| NFR3 | Data integrity in PostgreSQL | Use FK constraints, transactions for multi-table writes |
| NFR4 | User-friendly, intuitive UI | Follow `BRAND_GUIDELINES.md` |
| NFR5 | Compatible with modern browsers | Standard React/Vite output, no deprecated APIs |
| NFR6 | Support multiple concurrent users | Stateless JWT auth, connection pooling (`pg.Pool`) |
| NFR7 | Detailed audit records | See `audit_logs`; log every security-relevant event |
| NFR8 | Modular, maintainable architecture | One service module per concern (Section 2) |
| NFR9 | Future scalability | Three-tier separation; environment-based config |
| NFR10 | Reliable access for authorized users, denial for unauthorized | Default-deny posture everywhere |

---

## 8. Core Zero Trust Access Workflow (Implement as a Single Pipeline)

Implement this as a chained middleware/pipeline in the backend. Each step must short-circuit with a `403`/`401` and an audit log entry on failure.

```
1. POST /api/auth/login        → validate email + password (bcrypt)
2. POST /api/auth/totp-verify  → validate TOTP code against user's totp_secret
3. (within login flow)         → check submitted device_fingerprint against `devices`
                                  - if unknown: create device with trust_status='pending', deny access
                                  - if 'revoked': deny access
                                  - if 'trusted': proceed
4. On success of 1–3           → issue JWT (includes user_id, role_id, device_id), create `sessions` row
5. Every subsequent request to /api/protected/*:
   a. Validate JWT signature & expiry
   b. Validate session row is 'active' and not expired
   c. Load user role
   d. Policy Enforcement Engine: check `policies` for (role_id, resource_name) match + evaluate access_condition
   e. If all pass → 200 + resource data
   f. If any fail → 403, write audit_logs entry, optionally mark session 'terminated' for repeated violations
6. All steps write to audit_logs (success and failure).
```

This pipeline is the literal implementation of the security model in Section 11.

---

## 9. Backend API Specification

Implement these endpoints under `/api`. All protected endpoints require `Authorization: Bearer <jwt>`.

### Auth & Onboarding
- `POST /api/auth/register` — FR1. Body: `{ full_name, email, password }`. Hash password with bcrypt, default role = Guest, returns user (no token yet).
- `POST /api/auth/login` — FR2. Body: `{ email, password, device_fingerprint, device_name }`. Returns either `{ requires_totp: true, temp_token }` (if TOTP enabled) or proceeds to device check.
- `POST /api/auth/totp/setup` — generates TOTP secret + QR code for enrollment (authenticated).
- `POST /api/auth/totp/verify` — FR3/FR4. Body: `{ temp_token, totp_code }`. On success, performs device check (FR5/FR6) and issues final JWT + creates session.
- `POST /api/auth/logout` — terminates current session (sets `sessions.status = 'terminated'`).

### Device Management
- `GET /api/devices` — list current user's devices (or all, if Administrator).
- `POST /api/devices/register` — register a new device fingerprint (trust_status='pending').
- `PATCH /api/devices/:id/trust` — Administrator-only: set trust_status to 'trusted'/'revoked'.
- `DELETE /api/devices/:id` — remove a device.

### Resource Access
- `GET /api/resources` — list resources available to the current user's role (derived from `policies`).
- `POST /api/access-requests` — FR9/FR10. Body: `{ resource_name }`. Runs the full Zero Trust pipeline (Section 8, step 5) and returns grant/deny.

### Policy Management (Administrator only)
- `GET /api/policies`
- `POST /api/policies` — `{ role_id, resource_name, access_condition }`
- `PUT /api/policies/:id`
- `DELETE /api/policies/:id`

### User Management (Administrator only)
- `GET /api/users`
- `PATCH /api/users/:id` — update role_id, status
- `DELETE /api/users/:id`

### Session Management
- `GET /api/sessions` — Administrator: all sessions; user: own sessions.
- `DELETE /api/sessions/:id` — force-terminate a session.

### Audit Logs (Administrator only)
- `GET /api/audit-logs` — supports query filters (user_id, date range, activity type).

### Roles
- `GET /api/roles` — list roles (used for populating admin dropdowns).

---

## 10. Frontend Pages (React Router Routes)

Implement the following routes. Apply `BRAND_GUIDELINES.md` to every page and shared component (NavBar, Sidebar, Cards, Tables, Forms, Badges, Modals).

### Public Pages
- `/login` — Login Page (email + password → TOTP step if enabled → device fingerprinting happens client-side via a fingerprinting utility, e.g. hashing of navigator/userAgent properties + stored local device ID).
- `/register` — Registration Page (full name, email, password, confirm password).

### Authenticated User Pages
- `/dashboard` — User Dashboard: account status, registered devices summary, recent activity, available resources.
- `/access-request` — Access Request Page: list of resources the user's role can request, with grant/deny result shown inline.
- `/devices` — Device Management Page: list own devices, trust status, register new device, remove device.

### Administrator Pages (guarded by RBAC — Administrator only; non-admins redirected)
- `/admin` — Admin Dashboard: summary cards (total users, devices pending trust, active sessions, recent failed logins).
- `/admin/users` — User Management Page: table of users, edit role/status, delete.
- `/admin/devices` — Device Management Page (admin view): all devices, approve/revoke trust.
- `/admin/policies` — Policy Management Page: CRUD for `policies` (role, resource, condition).
- `/admin/audit-logs` — Audit Logs Page: searchable/filterable table of `audit_logs`.

### Routing & Guard Rules
- Implement a `ProtectedRoute` wrapper that checks for a valid JWT (and refreshes/validates session via `/api/auth/me` or similar) before rendering.
- Implement an `AdminRoute` wrapper that additionally checks `role_name === 'Administrator'`; otherwise redirect to `/dashboard` with an "access denied" notice (this itself should be visible — it demonstrates RBAC working).
- Unauthenticated users attempting any protected route are redirected to `/login`.

---

## 11. Security Model (Non-Negotiable Checklist)

Every protected request must pass ALL of the following, in order. Implement this explicitly as commented pipeline steps so it is demonstrable during evaluation/demo:

1. ✅ **User Authentication** — valid email/password (bcrypt compare)
2. ✅ **Two-Factor Authentication** — valid TOTP code (Google Authenticator)
3. ✅ **Device Verification** — device fingerprint registered and `trust_status = 'trusted'`
4. ✅ **Role Verification** — user's `role_id` permits the requested action/route
5. ✅ **Policy Verification** — a matching row in `policies` for (role, resource) with satisfied `access_condition`
6. ✅ **Session Validation** — JWT valid, not expired, and corresponding `sessions` row is `status = 'active'`

**If any check fails → deny access (401/403), write an `audit_logs` entry describing which check failed, and do not proceed further in the pipeline.**

---

## 12. Build Order (Recommended Sprints, aligned with MVP phases)

Build incrementally and keep each phase runnable/demoable end-to-end.

### Phase 1 — Authentication & Access Control Core
- Project scaffolding (frontend + backend + DB), `.env`, `schema.sql`, seed data
- FR1, FR2, FR3, FR4, FR7 (registration, login, TOTP enrollment/verify, JWT issuance, role assignment)
- Pages: `/login`, `/register`, `/dashboard`

### Phase 2 — Device Verification
- FR5, FR6 (fingerprint generation, registration, trust check enforced in login pipeline)
- Pages: `/devices`, `/admin/devices`

### Phase 3 — Policy Enforcement Engine
- FR8, FR9, FR10 (RBAC middleware, policies table + CRUD, access-request flow with full pipeline)
- Pages: `/access-request`, `/admin/policies`

### Phase 4 — Session Management, Monitoring & Admin
- FR11, FR12, FR13, FR14, FR15 (session validation/expiry, audit logging across all prior phases, admin dashboard, user management, audit logs page)
- Pages: `/admin`, `/admin/users`, `/admin/audit-logs`

At the end of Phase 4, the system must support this demonstrable scenario (from the MVP plan):
- An Administrator can log in (with 2FA + trusted device) and access all admin pages.
- An Employee logging in and attempting `/admin/*` is blocked (RBAC denial, logged).
- A login attempt from an unregistered device is blocked regardless of valid credentials (logged).
- Expired/terminated sessions are rejected on the next request.

---

## 13. Deliverables Expected from This Build

- Fully functional web-based ZTNA prototype (frontend + backend + database, runnable locally)
- `schema.sql` with full schema, FKs, and seed data
- Postman collection covering all endpoints in Section 9
- `.env.example` documenting all required environment variables (DB connection, JWT secret, TOTP issuer name, port, etc.)
- README with setup/run instructions for frontend, backend, and database
- All pages from Section 10 implemented and reachable via the routes specified, styled per `BRAND_GUIDELINES.md`

---

## 14. Out of Scope (Do Not Build)

- Full VPN / network-level tunneling or traffic interception
- Integration with external identity providers (SSO/SAML/OAuth)
- Machine-learning-based anomaly/threat detection
- Native mobile/desktop client apps (web-based client only)
- Multi-region/horizontal scaling infrastructure (Docker/K8s optional but not required)

These exclusions match the documented scope of the underlying research project and should not be added even if they seem like natural extensions.
