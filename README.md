# PesoBudget — Production-Quality Personal Budget Management Web Application

A secure, privacy-first personal finance and budget management web application built with **Next.js**, **TypeScript**, **Tailwind CSS**, **Google OAuth**, **Google Apps Script API**, and **Google Sheets Persistence**.

---

## Architecture Overview

```text
Next.js Application (Browser / Server)
        │
        │ HTTPS (HttpOnly Session Cookie + Google `sub` Claim)
        ▼
Next.js Server API Layer (Policy Enforcement Point)
        │
        │ HTTPS POST (Signed HMAC-SHA256 Payload + Timestamp)
        ▼
Google Apps Script API Layer (Web App Endpoint)
        │
        │ LockService + User-Partitioned Queries
        ▼
Google Sheets Persistence Store
(Users, Accounts, Categories, Transactions, Budgets, RecurringRules, AuditLogs)
```

---

## Key Engineering & Security Highlights

1. **Strict User Data Isolation via Google `sub` Claim**:
   - Every request is validated server-side.
   - The user identifier is derived exclusively from the immutable Google `sub` claim from the verified JWT session.
   - Client-supplied `userId` parameters are completely discarded to prevent Broken Object Level Exploitation (BOLA / IDOR).
2. **Integer Minor Units Financial Arithmetic**:
   - Zero binary floating-point rounding issues (no IEEE 754 precision traps like `19.99 * 100 = 1998.9999999999998`).
   - All currencies (PHP, USD, etc.) are computed in integer minor units (centavos/cents) and converted to decimals for localized display only.
3. **Google Sheets Security & Formula Injection Defense**:
   - All text inputs beginning with `=`, `+`, `-`, or `@` are prepended with `'` so Google Sheets never executes CSV/formula injection attacks.
4. **Zero-Trust Backend API**:
   - The Google Apps Script backend verifies shared secret tokens and validates timestamps (rejecting replays > 60 seconds).
   - Race conditions are eliminated using `LockService.getScriptLock()` with a 15-second timeout.
5. **Privacy by Design & Right to Erasure**:
   - Only minimum required OAuth scopes (`openid`, `email`, `profile`) are requested.
   - No access to Gmail, Google Drive, Calendar, or Contacts.
   - Dedicated data purge endpoint cascades and deletes all records across all sheets upon user confirmation (`DELETE_ALL_MY_DATA`).

---

## Directory Structure

```text
/Users/localadmin/Projects/budget_app/
├── apps-script/
│   ├── Code.gs                   # Complete deployable Google Apps Script API
│   ├── appsscript.json           # Apps Script manifest
│   └── README.md                 # Step-by-step Apps Script deployment guide
├── src/
│   ├── app/
│   │   ├── api/                  # Authenticated REST API route handlers
│   │   │   ├── auth/             # NextAuth Google OAuth catch-all
│   │   │   ├── dashboard/        # Dashboard aggregate summary
│   │   │   ├── transactions/     # Transaction list, create, update, delete
│   │   │   ├── budgets/          # Budget list, upsert, copy, delete
│   │   │   ├── categories/       # Category management
│   │   │   ├── accounts/         # Cash, Bank, E-wallet management
│   │   │   ├── reports/          # Monthly & yearly reporting
│   │   │   └── user/             # Profile settings & GDPR data purge
│   │   ├── dashboard/            # Interactive financial dashboard
│   │   ├── transactions/         # Transaction search, filter, and management
│   │   ├── budgets/              # Monthly/yearly budgets & category comparison
│   │   ├── reports/              # Visual spending breakdown & trends
│   │   ├── settings/             # Accounts, localization & privacy purge
│   │   ├── login/                # Google sign-in with scope disclosures
│   │   ├── privacy/              # Privacy policy & security documentation
│   │   ├── terms/                # Terms of service
│   │   ├── layout.tsx            # Root layout with Navbar & Footer
│   │   └── page.tsx              # Landing page
│   ├── components/
│   │   ├── ui/                   # Button, Card, Dialog, Input, Select, etc.
│   │   ├── layout/               # Navbar, Footer, PeriodSelector
│   │   ├── transactions/         # TransactionModal, FilterBar
│   │   └── budgets/              # BudgetModal, BudgetCopyModal
│   ├── lib/
│   │   ├── auth.ts               # NextAuth Google provider & server auth helpers
│   │   ├── api-response.ts       # Standardized response envelopes & sanitized errors
│   │   ├── math/money.ts         # Integer minor units calculation engine
│   │   ├── db/                   # Storage abstraction (AppsScriptClient & MockStorageAdapter)
│   │   └── security/hmac.ts      # HMAC signature generation & verification
│   ├── types/                    # Domain models & TypeScript interfaces
│   └── validations/              # Zod schemas & sanitization
├── tests/
│   ├── unit/                     # Minor units math tests
│   ├── integration/              # Data isolation & multi-user tests
│   └── security/                 # IDOR & formula injection tests
├── .env.example                  # Environment configuration template
├── next.config.ts                # Strict security headers & CSP
└── tsconfig.json                 # Strict TypeScript configuration
```

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

For immediate local development, `USE_MOCK_STORAGE=true` is enabled by default. This uses the high-fidelity in-memory storage adapter that replicates all Google Apps Script operations and allows multi-tenant testing out of the box.

To connect to live Google Sheets via Google Apps Script:
1. Follow the deployment steps in [`apps-script/README.md`](./apps-script/README.md).
2. Set `APPS_SCRIPT_URL` to your Apps Script Web App URL.
3. Set `APPS_SCRIPT_SHARED_SECRET` to the secret defined in your Apps Script project properties.
4. Set `USE_MOCK_STORAGE=false`.
5. Provide your Google Cloud OAuth Client ID and Secret (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`).

### 3. Run Automated Tests

```bash
npm test
```

Executes the Vitest test suite covering:
- Minor units calculations & budget utilization
- Multi-tenant user data isolation (verifying User A cannot access or mutate User B records)
- Formula injection sanitization
- Malformed inputs and negative value rejection
- Complete financial lifecycle (Onboarding → Accounts → Transactions → Budgets → Dashboard → Purge)

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Privacy & Security Verification

- **IDOR / BOLA Prevention**: Tested in `tests/integration/data-isolation.test.ts`. User B mutating User A transactions fails with 403/404.
- **Formula Injection**: Tested in `tests/security/validation-security.test.ts`. Dangerous inputs (`=cmd|...`, `@IMPORTXML...`) are sanitized.
- **No Floating-Point Math**: Tested in `tests/unit/money.test.ts`. Decimal strings are parsed to minor centavos, preserving 100% precision.
