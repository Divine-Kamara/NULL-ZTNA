# NULL // Zero Trust Network Access Platform

NULL is a Zero Trust Network Access (ZTNA) platform designed to enforce the principle **"Never Trust, Always Verify."** It re-evaluates trust parameters (identity, multi-factor passcode, client hardware fingerprint, session freshness, and access policies) on every resource request.

---

## Project Structure

```
d:\NULL\
├── .env.example                # Base environment variables
├── .env                        # Local configuration
├── schema.sql                  # PostgreSQL table definitions & seed roles
├── README.md                   # Setup and run guide (this document)
├── NULL_ZTNA.postman_collection.json # API Postman collection
├── backend\
│   ├── server.js               # Express API entrypoint
│   ├── db.js                   # Dual-mode database layer
│   ├── middleware\             # JWT/Admin access guards
│   └── services\               # Modular business logic services
└── frontend\
    ├── index.html              # Entry HTML
    ├── tailwind.config.js      # Custom console styling
    └── src\
        ├── components\         # Reusable styling components
        ├── context\            # Global Auth Context
        ├── pages\              # Client views
        └── utils\              # stable hardware fingerprint generator
```

---

## Hybrid Database Architecture

To facilitate zero-configuration local evaluation, the backend runs in a dual-mode:
1. **PostgreSQL Mode:** If connection details in `.env` are valid and the database server is running, the app integrates directly with PostgreSQL.
2. **In-Memory Mock Mode:** If connection fails (e.g. PostgreSQL is not installed locally), the backend automatically falls back to an in-memory database seeded with default roles and an Administrator account. This allows you to evaluate the entire project immediately without any configuration.

---

## Quick Start Setup

### 1. Database Integration (PostgreSQL)

If a local PostgreSQL server is active, create a database named `null_ztna` and execute the schema initialization:

```bash
# Connect using psql and run:
psql -U postgres -d null_ztna -f schema.sql
```

### 2. Configuration Settings

Create a `.env` file at the root (an initial one is cloned from `.env.example` during scaffold):

```env
PORT=5000
JWT_SECRET=super_secret_jwt_sign_key_change_in_production
TOTP_ISSUER=NULL-ZTNA

# Seed Admin Account
ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@null.local
ADMIN_PASSWORD=AdminPass123!

# Database connection credentials
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=null_ztna
```

### 3. Backend Execution

Navigate to the `backend/` directory, install packages, and start the API server:

```bash
cd backend
npm install
npm run dev # Launches nodemon server on http://localhost:5000
```

### 4. Frontend Execution

Navigate to the `frontend/` directory, install packages, and start the Vite development server:

```bash
cd ../frontend
npm install
npm run dev # Launches local web client (typically http://localhost:5173)
```

---

## Seed Accounts (First Log in)

Once servers are running, log in using the preseeded Administrator credentials:

*   **Email:** `admin@null.local`
*   **Password:** `AdminPass123!`
*   **Default 2FA:** Disabled on first load. You can enable 2FA for this user via the dashboard.

---

## Key Security Workflows (Zero Trust Pipeline)

Each network action is verified against a 6-step checklist:
1.  **Identity Verification:** Email and password match (verified via `bcrypt`).
2.  **MFA Verification:** TOTP code validation (using Google Authenticator compatible time-based tokens).
3.  **Device Fingerprint Validation:** Check if the browser's hardware fingerprint is registered and approved (`trust_status = 'trusted'`).
4.  **Role Authorization:** Evaluate RBAC access restrictions.
5.  **Policy Evaluation:** Validate requested resource policies in the `policies` table.
6.  **Session Integrity Check:** Verify JWT signature and ensure the active session state in the database is `'active'`.
"# NULL-ZTNA" 
