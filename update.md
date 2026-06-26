# NULL // ZTNA — Enterprise Environment Module: Implementation Prompt
**Project:** Design and Implementation of a Zero Trust Network Access (ZTNA) Client for Secure Remote Access in Enterprise Environment
**Student:** KAMARA DIVINE KAMARA (JNR) — ICTU20234046
**Supervisor:** Eng. ANDREW AGBOR — ICT University, Yaoundé, Cameroon
**IDE Target:** Antigravity

---

## 1. Context & Current State

The NULL ZTNA platform is a fully functional, web-based Zero Trust Network Access broker built with:

- **Frontend:** React.js + Vite + Tailwind CSS (running on `http://localhost:5173`)
- **Backend:** Node.js + Express.js (running on `http://localhost:5000`)
- **Database:** PostgreSQL (with an in-memory fallback mode)

The system currently enforces a **6-gate Zero Trust security pipeline** on every access request:

| Gate | Check | Mechanism |
|------|-------|-----------|
| 1 | User Authentication | Email + bcrypt password |
| 2 | Two-Factor Authentication | Google Authenticator TOTP |
| 3 | Device Verification | Hardware browser fingerprint |
| 4 | Role Verification | RBAC (Administrator / Employee / Guest) |
| 5 | Policy Verification | Policy table conditions per resource |
| 6 | Session Validation | JWT + active DB session state |

When all 6 gates pass, the UI displays **"ACCESS GRANTED"** — but the user is then taken **nowhere**. There is no attached enterprise environment that the user is actually being granted access *to*. This is the critical missing piece.

**The ZTNA broker (NULL) sits in the middle — but there is no enterprise on the other side of it.** The jury and defense panel will expect to see that after passing through all security gates, each user role lands inside a protected enterprise workspace that reflects their authorization level.

---

## 2. The Problem to Solve

> After passing all 6 Zero Trust gates and receiving "ACCESS GRANTED", users must be redirected into a **simulated enterprise internal environment** whose content and capabilities are determined by their assigned RBAC role.

This enterprise environment must be:
1. **Protected** — completely inaccessible without first passing the ZTNA pipeline.
2. **Role-differentiated** — what an Administrator sees and can do must differ from an Employee (Staff), who differs from a Guest (Student).
3. **Realistic for defense** — it must model a real-world organization that has adopted Zero Trust to protect sensitive internal resources. The chosen organization model is an **Academic Institution (School/University)**.
4. **Integrated into the existing codebase** — no new backend stack; extend the current React frontend and Express backend.

---

## 3. Existing Codebase Structure (Do Not Alter Core ZTNA Logic)

```
NULL/
├── .env
├── schema.sql
├── backend/
│   ├── server.js          ← Main Express API — add enterprise routes here
│   ├── db.js              ← Database layer
│   ├── middleware/
│   │   └── auth.js        ← JWT middleware — reuse for enterprise routes
│   └── services/
│       ├── authService.js
│       ├── sessionService.js
│       ├── totpService.js
│       └── auditService.js
└── frontend/
    └── src/
        ├── App.jsx         ← Add new enterprise routes here
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   ├── ProtectedRoute.jsx  ← Reuse/extend for enterprise guard
        │   └── Sidebar.jsx         ← Extend with enterprise nav links
        └── pages/
            ├── AccessRequest.jsx   ← Modify: redirect here on ACCESS GRANTED
            ├── Dashboard.jsx
            └── [NEW enterprise pages go here]
```

The **three existing roles** in the database are:
- `Administrator` — `{ "all": true }`
- `Employee` — `{ "read_resources": true }`
- `Guest` — `{ "read_guest_resources": true }`

---

## 4. What to Build: The Enterprise Environment Module

### 4.1 Overview — The Protected Enterprise: A School Academic Management System

The enterprise that NULL ZTNA is protecting is a **School Academic Management Portal** — an internal system used by a secondary school or university to manage student results, transcripts, and academic records.

This is a deliberate and meaningful choice for the defense because it illustrates **precisely why Zero Trust matters**:

- A corrupt staff member (Employee role) could log in remotely, edit a student's grades to make them pass an exam, and leave no trace — unless every access is verified, logged, and monitored.
- With NULL ZTNA in place, the Administrator role can see **who logged in, from which device, at what time, and what changes they made** — making every action in the system fully attributable and auditable.
- A student (Guest role) can only **view their own results** — they cannot see other students' records and cannot make any changes whatsoever.

The three RBAC roles map to the school as follows:

| NULL ZTNA Role | School Role | Access Level |
|----------------|-------------|--------------|
| `Administrator` | School IT Administrator / Principal | Full system oversight: monitors all users, all transcript edits, all login events, all device activity. Can manage staff accounts and review the complete audit trail. |
| `Employee` | Academic Staff / Results Officer | Can view and edit student transcripts and grades for their assigned courses. Cannot access other staff's records or the administrative audit panel. |
| `Guest` | Student | Can only view their own academic transcript and results. Cannot edit anything. Cannot see other students' records. |

The enterprise portal must have **three role-based views**, each rendering as new React pages under a shared portal shell.

---

### 4.2 Frontend — New Pages to Create

All new pages live under: `frontend/src/pages/enterprise/`

---

#### A. `EnterprisePortal.jsx` — Shared Landing Shell (All Roles)

**Path:** `frontend/src/pages/enterprise/EnterprisePortal.jsx`

This is the first page every user sees immediately after "ACCESS GRANTED". It serves as the authenticated entry point into the school system.

**Content:**
- A header banner reading: `"NEXUS ACADEMY — Internal Academic Management System"` with a subtitle: `"Access secured and brokered by NULL Zero Trust Network Access"`
- A role badge showing the user's name and role (e.g., `KAMARA DIVINE — STAFF` or `STUDENT`)
- A **ZTNA Session Summary card** showing:
  - All 6 gates with PASS badges (pulled from the access request result stored in context/state)
  - Active session token expiry countdown (derived from JWT `exp` claim)
  - Device fingerprint ID (truncated, e.g., `FP: a3f9...c12d`)
- A **"What you can access"** panel that lists the modules available to this user's role (described below), with a "Enter Portal" button that routes to the role-specific home page
- A persistent amber notice bar at the bottom: `"All actions within this portal are recorded and monitored under Zero Trust policy. Unauthorized access attempts are logged and flagged."`

---

#### B. `EnterpriseAdmin.jsx` — Administrator View (School IT Admin / Principal)

**Path:** `frontend/src/pages/enterprise/EnterpriseAdmin.jsx`

The administrator has full visibility over everything happening inside the school system. This page demonstrates the **audit and accountability** power of Zero Trust.

**Modules / Sections:**

**1. System Overview Dashboard**
Four stat cards at the top:
- `Total Registered Users` — fetched from `GET /api/admin/users` (count)
- `Active Sessions Right Now` — fetched from `GET /api/admin/sessions` (count of status: 'active')
- `Transcript Edits Today` — fetched from `GET /api/enterprise/audit?action=TRANSCRIPT_EDIT` (count)
- `Failed Access Attempts` — fetched from `GET /api/enterprise/audit?action=ACCESS_DENIED` (count)

**2. Staff & Student Directory**
A full table fetched from `GET /api/admin/users` showing:
- Full Name, Email, Role (badge-colored: Admin = teal, Staff = blue, Student = grey), Account Status, Device Trust Status, Last Login timestamp
- The administrator can see every account in the system — staff and students alike

**3. Complete Transcript Audit Log** ← *The most important panel for the defense*
A table fetched from `GET /api/admin/audit-logs`, filtered to show activities containing `"TRANSCRIPT"`. Columns:
- Timestamp, Staff Member Name, Student Affected, Action Performed (e.g., `TRANSCRIPT_EDIT: Updated MATH101 grade B→A`), IP Address, Device Fingerprint
- This panel directly demonstrates the ZTNA accountability argument: *"We know exactly who changed what grade, when, and from which device."*
- Each row has a teal left border and a `LOGGED` badge.

**4. Full System Audit Trail**
All audit log entries from `GET /api/admin/audit-logs` in a scrollable table — not filtered. Shows every login, access request, policy check, and enterprise action across all users.

**5. Active Sessions Monitor**
A live table from `GET /api/admin/sessions` showing all currently active sessions: User, Login Time, Expiry Time, IP Address, Status badge. The administrator can see who is currently inside the school system at any moment.

**6. ZTNA Policy Registry**
A read-only table from `GET /api/admin/policies` showing all access policies protecting the enterprise resources.

---

#### C. `EnterpriseEmployee.jsx` — Employee View (Academic Staff / Results Officer)

**Path:** `frontend/src/pages/enterprise/EnterpriseEmployee.jsx`

The staff member's view is the **operational heart** of the school system. Staff can view and edit transcripts — but every single action they take is silently logged to the audit trail, which the administrator can inspect.

**Modules / Sections:**

**1. Staff Welcome Panel**
- Displays: `"Welcome, [Name] — Academic Staff Portal"`
- Shows their role, their trusted device fingerprint, and their session expiry countdown
- A notice: `"All transcript modifications you make are recorded in the ZTNA audit log and are reviewable by the Administrator."`

**2. Student Transcript Management** ← *The core staff function*
A searchable table of student records. Each row represents one student and contains: Student Name, Student ID, Programme, and a list of courses with current grades.

Since the database does not have a students/transcripts table yet (see Section 4.5), this data will come from a new backend endpoint that seeds static student records into memory or a new table.

Each student row has an **"Edit Transcript"** button. Clicking it opens a modal containing:
- Student name and ID (read-only)
- A list of course entries, each with a grade dropdown: `A`, `B`, `C`, `D`, `F`
- A **"Save Changes"** button

On save, the frontend calls `POST /api/enterprise/transcript/edit` with the payload `{ studentId, courseCode, oldGrade, newGrade }`. The backend logs this immediately to `audit_logs` with the activity string: `"TRANSCRIPT_EDIT: [StaffName] changed [StudentName] [CourseCode] grade from [oldGrade] to [newGrade]"`. The response returns success and the staff member sees a confirmation toast: `"Grade updated and change logged to audit trail."`

**3. My Activity Log**
A personal log — fetched from `GET /api/enterprise/my-audit-logs` — showing only this staff member's own recent actions within the enterprise portal. Columns: Timestamp, Action, Student Affected. This is a filtered view of their own audit entries.

**4. My Trusted Devices**
Fetched from `GET /api/user/devices`. Shows the devices registered and trusted under their account. A reminder that ZTNA verified their current device before granting access.

---

#### D. `EnterpriseGuest.jsx` — Guest View (Student)

**Path:** `frontend/src/pages/enterprise/EnterpriseGuest.jsx`

The student can only see their own record. They cannot edit, cannot see other students, and cannot access any administrative or staff functions. Attempting to navigate to restricted routes shows a hard denial screen.

**Modules / Sections:**

**1. Student Welcome Panel**
- `"Welcome, [Name] — Student Self-Service Portal"`
- Their Student ID, Programme of Study, current academic year
- A notice: `"You are accessing the Nexus Academy system through a verified Zero Trust session. You may only view your own academic record."`

**2. My Academic Transcript** ← *The only data-access function for students*
A styled transcript card showing:
- Student Name, Student ID, Programme, Academic Year
- A table of courses: Course Code, Course Name, Credit Hours, Grade, Remark (Pass/Fail)
- A calculated **GPA / CGPA** at the bottom
- A `"Download Transcript (PDF)"` button — this is UI-only for now; clicking it shows a modal: `"Transcript download request logged. Please visit the Registrar's office to collect a certified copy."`

This transcript data is fetched from `GET /api/enterprise/my-transcript` (new endpoint, returns the student's own record only — never another student's).

**3. Academic Notices Board**
Three static notices (hardcoded):
- `"Second semester examinations begin 14 July 2026 — Check your timetable."`
- `"Results for CSCI301 have been released. Log in to view your grade."`
- `"Scholarship application deadline: 30 June 2026. Visit the bursary office."`

**4. Access Restriction Notice**
A permanently visible amber panel at the bottom:
`"Your role (Student) permits read-only access to your own academic record. Any attempt to access staff or administrative resources has been logged and will be reviewed."`

**5. Access Denied Screen (Route Guard)**
If a Guest user manually navigates to `/enterprise/admin` or `/enterprise/staff` via URL, they must see a full-page denial screen — not a simple toast. The screen shows:
- A red shield icon
- `"ACCESS DENIED"`
- `"Your role (Guest/Student) does not have permission to access this resource."`
- `"This unauthorized access attempt has been recorded in the ZTNA audit log with your identity, device fingerprint, and timestamp."`
- A button: `"Return to My Portal"`
- The frontend also fires `POST /api/enterprise/access-log` with `{ action: "UNAUTHORIZED_ACCESS_ATTEMPT", resource: "/enterprise/admin" }` so the administrator's audit panel shows this event.

---

### 4.3 Navigation — Modify `Sidebar.jsx`

After a successful access grant (`accessGranted === true`), add a new sidebar section titled `NEXUS ACADEMY PORTAL`. Show links conditionally based on the user's role:

```
NEXUS ACADEMY PORTAL
  ├── [All roles]   Portal Home         → /enterprise
  ├── [Admin only]  System Overview     → /enterprise/admin
  ├── [Admin only]  Staff & Students    → /enterprise/admin/users
  ├── [Admin only]  Transcript Audit    → /enterprise/admin/transcripts
  ├── [Admin only]  Full Audit Trail    → /enterprise/admin/audit
  ├── [Admin only]  Active Sessions     → /enterprise/admin/sessions
  ├── [Staff only]  Transcript Manager  → /enterprise/staff
  ├── [Staff only]  My Activity Log     → /enterprise/staff/activity
  └── [Student only] My Transcript      → /enterprise/student
```

Links for roles that do not match the current user must not render at all — not greyed out, not visible. This is itself a Zero Trust principle: users only see what they are permitted to access.

---

### 4.4 State / Routing — Modify `App.jsx` and `AccessRequest.jsx`

#### In `AccessRequest.jsx`:
When the 6th gate (`Session Validation`) returns PASS and the "ACCESS GRANTED" panel renders:
1. Store the access result (all 6 gate statuses) into a context value: `setAccessResult(results)` and set `setAccessGranted(true)`.
2. After a 2-second display of the "ACCESS GRANTED" panel, automatically redirect to `/enterprise` using `useNavigate()`.
3. Log an audit event via `POST /api/audit` with action: `"ENTERPRISE_ACCESS_GRANTED"`.

#### In `App.jsx`:
Add new protected routes:
```jsx
<Route path="/enterprise" element={<EnterpriseGuard><EnterprisePortal /></EnterpriseGuard>} />
<Route path="/enterprise/admin" element={<EnterpriseGuard role="Administrator"><EnterpriseAdmin /></EnterpriseGuard>} />
<Route path="/enterprise/admin/users" element={<EnterpriseGuard role="Administrator"><EnterpriseAdmin section="users" /></EnterpriseGuard>} />
<Route path="/enterprise/admin/transcripts" element={<EnterpriseGuard role="Administrator"><EnterpriseAdmin section="transcripts" /></EnterpriseGuard>} />
<Route path="/enterprise/admin/audit" element={<EnterpriseGuard role="Administrator"><EnterpriseAdmin section="audit" /></EnterpriseGuard>} />
<Route path="/enterprise/admin/sessions" element={<EnterpriseGuard role="Administrator"><EnterpriseAdmin section="sessions" /></EnterpriseGuard>} />
<Route path="/enterprise/staff" element={<EnterpriseGuard role="Employee"><EnterpriseEmployee /></EnterpriseGuard>} />
<Route path="/enterprise/staff/activity" element={<EnterpriseGuard role="Employee"><EnterpriseEmployee section="activity" /></EnterpriseGuard>} />
<Route path="/enterprise/student" element={<EnterpriseGuard role="Guest"><EnterpriseGuest /></EnterpriseGuard>} />
```

#### New `EnterpriseGuard.jsx` component:
**Path:** `frontend/src/components/EnterpriseGuard.jsx`

This guard wraps all enterprise routes and enforces the Zero Trust rule that access to the enterprise can only occur through the verified ZTNA pipeline:
1. If the user has no valid JWT in `AuthContext` → redirect to `/login`.
2. If `accessGranted !== true` in context → redirect to `/access-request` with a toast: `"You must complete ZTNA verification before entering the Enterprise Portal."`
3. If a `role` prop is passed and `user.role !== role` → do **not** redirect silently. Instead render the full-page `AccessDeniedScreen` component (described in Section 4.2D) and fire `POST /api/enterprise/access-log` to record the unauthorized attempt.

#### In `AuthContext.jsx`:
Add two new state values:
```js
const [accessGranted, setAccessGranted] = useState(false);
const [accessResult, setAccessResult] = useState(null); // stores the 6-gate results
```
Expose both values and their setters through the context so `AccessRequest.jsx`, `EnterpriseGuard.jsx`, and `EnterprisePortal.jsx` can all read them.

---

### 4.5 Backend — New Endpoints to Add in `server.js`

All new enterprise routes must use the existing `authenticateToken` middleware from `backend/middleware/auth.js`.

#### New in-memory data to seed (add to the in-memory mock in `db.js` or `server.js`):

Seed a static array of student transcript records that the backend can serve. These are fictional students for demonstration:

```js
const studentTranscripts = [
  {
    studentId: "STU2023001", name: "Amara Diallo", programme: "BSc Computer Science", year: "Year 2",
    courses: [
      { code: "CSCI101", name: "Introduction to Programming", credits: 3, grade: "A" },
      { code: "MATH101", name: "Calculus I", credits: 3, grade: "B" },
      { code: "CSCI102", name: "Data Structures", credits: 3, grade: "A" },
      { code: "ENGL101", name: "Communication Skills", credits: 2, grade: "B" },
    ]
  },
  {
    studentId: "STU2023002", name: "Ngozi Okafor", programme: "BSc Cybersecurity", year: "Year 2",
    courses: [
      { code: "CSCI101", name: "Introduction to Programming", credits: 3, grade: "B" },
      { code: "MATH101", name: "Calculus I", credits: 3, grade: "C" },
      { code: "SECU101", name: "Network Security Fundamentals", credits: 3, grade: "A" },
      { code: "ENGL101", name: "Communication Skills", credits: 2, grade: "A" },
    ]
  },
  {
    studentId: "STU2023003", name: "Kwame Mensah", programme: "BSc Information Systems", year: "Year 1",
    courses: [
      { code: "CSCI101", name: "Introduction to Programming", credits: 3, grade: "C" },
      { code: "MATH101", name: "Calculus I", credits: 3, grade: "B" },
      { code: "ENGL101", name: "Communication Skills", credits: 2, grade: "B" },
    ]
  }
];
```

The student whose transcript is shown in the Guest view is determined by matching `user.email` to a student record, or simply always serving `STU2023001` as the demo Guest account's record.

---

#### New API endpoints:

```
GET  /api/enterprise/my-transcript
     Middleware: authenticateToken
     Role check: Guest only (if role !== 'Guest', return 403)
     Response: The transcript record matching the authenticated user's studentId
               (for demo purposes, always return the first seeded student record)

GET  /api/enterprise/transcripts
     Middleware: authenticateToken
     Role check: Employee or Administrator only (if role === 'Guest', return 403)
     Response: Full array of all studentTranscripts (for the Staff transcript management table)

POST /api/enterprise/transcript/edit
     Middleware: authenticateToken
     Role check: Employee only (if role !== 'Employee', return 403)
     Body: { studentId, studentName, courseCode, courseName, oldGrade, newGrade }
     Action:
       1. Find the matching student in studentTranscripts and update their grade in memory.
       2. Insert into audit_logs: activity = "TRANSCRIPT_EDIT: [user.full_name] changed [studentName] [courseCode] grade from [oldGrade] to [newGrade]", user_id = authenticated user's ID
     Response: { success: true, message: "Grade updated and logged." }

GET  /api/enterprise/my-audit-logs
     Middleware: authenticateToken
     Response: All audit_log entries where user_id = authenticated user's ID, ordered by timestamp DESC, limit 20

GET  /api/enterprise/audit?action=<filter>
     Middleware: authenticateToken
     Role check: Administrator only
     Query param: action (optional) — filter audit_logs by activity ILIKE '%<action>%'
     Response: Filtered or full audit log array

POST /api/enterprise/access-log
     Middleware: authenticateToken
     Body: { action, resource }
     Action: Insert into audit_logs: activity = "[action]: [resource]", user_id = authenticated user's ID, ip_address from request
     Response: { success: true }
```

---

### 4.6 Database — Schema Addition

Add one new table to `schema.sql` for persistent transcript storage (so edits survive server restarts if PostgreSQL is active):

```sql
CREATE TABLE IF NOT EXISTS student_transcripts (
    transcript_id SERIAL PRIMARY KEY,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    programme VARCHAR(255) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    courses JSONB NOT NULL,
    last_modified_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    last_modified_at TIMESTAMP DEFAULT NOW()
);

-- Seed student records
INSERT INTO student_transcripts (student_id, student_name, programme, academic_year, courses) VALUES
('STU2023001', 'Amara Diallo', 'BSc Computer Science', 'Year 2',
 '[{"code":"CSCI101","name":"Introduction to Programming","credits":3,"grade":"A"},{"code":"MATH101","name":"Calculus I","credits":3,"grade":"B"},{"code":"CSCI102","name":"Data Structures","credits":3,"grade":"A"},{"code":"ENGL101","name":"Communication Skills","credits":2,"grade":"B"}]'),
('STU2023002', 'Ngozi Okafor', 'BSc Cybersecurity', 'Year 2',
 '[{"code":"CSCI101","name":"Introduction to Programming","credits":3,"grade":"B"},{"code":"MATH101","name":"Calculus I","credits":3,"grade":"C"},{"code":"SECU101","name":"Network Security Fundamentals","credits":3,"grade":"A"},{"code":"ENGL101","name":"Communication Skills","credits":2,"grade":"A"}]'),
('STU2023003', 'Kwame Mensah', 'BSc Information Systems', 'Year 1',
 '[{"code":"CSCI101","name":"Introduction to Programming","credits":3,"grade":"C"},{"code":"MATH101","name":"Calculus I","credits":3,"grade":"B"},{"code":"ENGL101","name":"Communication Skills","credits":2,"grade":"B"}]')
ON CONFLICT (student_id) DO NOTHING;
```

The `last_modified_by` foreign key links every transcript change to a specific user account — reinforcing the ZTNA accountability chain directly in the database.

---

### 4.7 Visual / Styling Guidelines

The enterprise portal must **match the existing NULL ZTNA design language** precisely. The project uses a custom dark theme defined in `tailwind.config.js`. Key design tokens:

| Token | Usage |
|-------|-------|
| `bg-null-bg` | Page backgrounds |
| `bg-null-surface` | Cards and panels |
| `text-null-signal` | Teal/cyan — success, active states, Administrator badges |
| `text-null-deny` | Red — denied access, FAIL states, access denied screens |
| `text-null-warn` | Amber — warnings, Guest/Student notices, restricted content banners |
| `border-null-border` | Card and panel borders |
| `font-mono` | All IDs, fingerprints, timestamps, token strings |
| `font-sans` | Body text, labels |

Reference `frontend/src/pages/AdminDashboard.jsx` for stat card layout. Reference `frontend/src/pages/AdminAuditLogs.jsx` for the audit table layout. The enterprise portal must feel like it organically belongs in the same application — **same dark console aesthetic, same teal accent, same monospace typography for all identifiers.**

The **Nexus Academy** branding within the portal should feel like an internal intranet — use a simple text wordmark (`NEXUS ACADEMY // ACADEMIC MANAGEMENT SYSTEM`) in the portal header rather than a logo image.

---

## 5. Defense Demonstration Flow

After implementation, the jury will witness the following complete flow:

```
User visits NULL ZTNA at http://localhost:5173
              ↓
        [Login — Gate 1: Password Auth]
              ↓
        [TOTP Code — Gate 2: 2FA]
              ↓
        [Gate 3: Device fingerprint verified]
              ↓
        [Gate 4: RBAC role confirmed]
              ↓
        [Gate 5: Access policy evaluated]
              ↓
        [Gate 6: JWT + session validated]
              ↓
        "ACCESS GRANTED" (2-second display)
              ↓
   Auto-redirect → /enterprise (Portal Landing)
              ↓
   ┌──────────────────────────────────────────────┐
   │  Role: Administrator                          │
   │  → Full system dashboard                      │
   │  → Can see WHO changed WHICH student's grade  │
   │  → Can see every login, device, session       │
   │  → Can see the failed access attempts         │
   └──────────────────────────────────────────────┘
              OR
   ┌──────────────────────────────────────────────┐
   │  Role: Employee (Staff)                       │
   │  → Transcript Manager: view & edit grades     │
   │  → Every edit is silently logged              │
   │  → Can only see student records, not admin    │
   └──────────────────────────────────────────────┘
              OR
   ┌──────────────────────────────────────────────┐
   │  Role: Guest (Student)                        │
   │  → My Transcript: read-only personal record   │
   │  → Cannot edit, cannot see others             │
   │  → Any unauthorized URL attempt → denial      │
   │    screen + audit log entry                   │
   └──────────────────────────────────────────────┘
```

**The defense narrative this flow supports:**

> *"Nexus Academy stores sensitive student academic records. Before Zero Trust, a staff member working remotely could log in from any device, edit any student's grade, and the institution would have no way to know. With NULL ZTNA brokering all access: the staff member's identity is verified, their device is verified, their role is checked against policy, their session is validated — and every action they perform inside the system is written to an immutable audit log. The administrator can open the Transcript Audit panel at any time and see exactly who changed which grade, from which device, at which moment. This is Zero Trust Network Access in practice."*

---

## 6. Files to Create (Summary)

| File | Description |
|------|-------------|
| `frontend/src/pages/enterprise/EnterprisePortal.jsx` | Shared landing shell for all roles after access grant |
| `frontend/src/pages/enterprise/EnterpriseAdmin.jsx` | Administrator — full school system oversight |
| `frontend/src/pages/enterprise/EnterpriseEmployee.jsx` | Staff — transcript management with audit logging |
| `frontend/src/pages/enterprise/EnterpriseGuest.jsx` | Student — read-only personal transcript view |
| `frontend/src/components/EnterpriseGuard.jsx` | Route guard: blocks entry without ZTNA grant; logs unauthorized attempts |

---

## 7. Files to Modify (Summary)

| File | Change |
|------|--------|
| `frontend/src/App.jsx` | Add all `/enterprise/*` routes wrapped in `EnterpriseGuard` |
| `frontend/src/pages/AccessRequest.jsx` | On ACCESS GRANTED: set `accessGranted=true` in context, redirect to `/enterprise` after 2s |
| `frontend/src/components/Sidebar.jsx` | Add `NEXUS ACADEMY PORTAL` nav section, role-conditional links, visible only after `accessGranted` |
| `frontend/src/context/AuthContext.jsx` | Add `accessGranted` boolean + `accessResult` object to context state |
| `backend/server.js` | Add all new `/api/enterprise/*` endpoints listed in Section 4.5 |
| `schema.sql` | Add `student_transcripts` table + seed data from Section 4.6 |

---

## 8. Do Not Modify

- `backend/services/authService.js` — ZTNA auth logic is complete and working
- `backend/services/sessionService.js` — Session logic is working
- `backend/middleware/auth.js` — JWT middleware is working; only reuse it
- All existing 6-gate verification logic inside `AccessRequest.jsx` — only add the post-grant redirect, change nothing about the pipeline itself
- All existing Admin Console pages (`AdminDashboard`, `AdminUsers`, `AdminAuditLogs`, etc.) — these are the ZTNA broker's own admin interface and remain separate from the Nexus Academy enterprise portal

---

## 9. Final Note for the Defense Panel

The Nexus Academy enterprise environment does not need to be a production-grade school system. For the defense, it must satisfy three criteria:

1. It is **completely unreachable** without passing all 6 ZTNA gates. A direct URL visit to `/enterprise/admin` by an unauthenticated user must fail at the guard.
2. The role differentiation is **visually and functionally obvious** — a student account and a staff account must produce clearly different experiences.
3. The **audit trail is live and real** — when the staff member edits a grade during the demonstration, the administrator's audit panel must immediately show that edit with the staff member's name, the student affected, the old grade, the new grade, and the timestamp.

These three points are the complete proof of Zero Trust Network Access working as designed: *verify every user, enforce least-privilege access, and log everything.*
