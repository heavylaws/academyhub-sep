# PeakForm Athletics (Hercules Academy)

**PeakForm Athletics** is a comprehensive sports academy management platform built for academies managing coaching staff, athlete rosters, training schedules, attendance tracking, custom workout plans, performance assessments, AI video biomechanics analysis, and academy billing.

---

## Tech Stack

| Layer                        | Technology                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Frontend Framework**       | [React 19](https://react.dev/) + [Vite 8](https://vite.dev/) + [TypeScript](https://www.typescriptlang.org/)              |
| **Styling & UI**             | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| **Backend & Database**       | [Convex](https://www.convex.dev/) (Serverless Reactive Database & Functions)                                              |
| **Authentication**           | Convex Auth (email + password, email verified by one-time code)                                                           |
| **AI Biomechanics Analysis** | OpenAI Vision (`OPENAI_API_KEY`)                                                                                          |
| **Testing**                  | [Vitest](https://vitest.dev/) (Edge-runtime for Convex backend + jsdom for React frontend)                                |
| **Package Manager**          | [pnpm v9](https://pnpm.io/)                                                                                               |

---

## Directory Structure

```
├── archives/               # Original snapshot & source archives (git-ignored)
├── convex/                 # Backend Convex functions & database schemas
│   ├── _generated/         # Convex auto-generated API & data model types
│   ├── lib/                # Backend auth helpers & role-based access checks
│   ├── schema/             # Modular table schemas (academies, athletes, fees, etc.)
│   ├── snapshot/           # Unpacked sample data snapshot (JSONL tables)
│   ├── schema.ts           # Root database schema definition
│   ├── users.ts            # User onboarding & profile queries/mutations
│   ├── athletes.ts         # Athlete CRUD, CSV bulk import, and profile queries
│   ├── trainingSessions.ts # Team session scheduling & live attendance tracking
│   ├── trainingPlans.ts    # Custom workout plans & exercise items
│   ├── assessments.ts      # Metric tracking (vertical jump, sprint, etc.)
│   ├── videoAnalyses.ts    # AI video upload & report querying
│   ├── videoAnalysis.ts    # Node.js action invoking OpenAI Vision
│   ├── fees.ts             # Fee tracking, payment recording & notifications
│   ├── invoices.ts         # Invoice lifecycle (draft, sent, paid, overdue)
│   └── emails.ts           # Email dispatch for invites and fee updates
├── docs/                   # Project documentation (Walkthrough, specs)
├── src/
│   ├── components/         # Reusable UI (shadcn), layout, and context providers
│   ├── hooks/              # Custom React hooks (useCurrentUser, useAuth, useDebounce)
│   ├── lib/                # Frontend utilities
│   ├── pages/              # Role-specific application pages and routing
│   │   ├── admin/          # Platform admin: academy & billing management
│   │   ├── athletes/       # Roster, athlete detail, plans, AI video analysis
│   │   ├── auth/           # legacy /auth/callback redirect
│   │   ├── finance/        # Academy fee ledger & athlete "My Fees" view
│   │   ├── invoices/       # Formal invoice creation and tracking
│   │   ├── sessions/       # Session details & live attendance recording
│   │   ├── staff/          # Staff roster & email invite modal
│   │   └── teams/          # Team rosters, session calendar, and detail view
│   ├── App.tsx             # Root router with role-based ProtectedRoute guards
│   └── main.tsx            # Application entry point
├── .env.example            # Environment variables template
├── .env.local              # Local environment configuration (git-ignored)
└── vitest.config.ts        # Unit test configuration for Convex & Frontend
```

---

## Roles and Permissions

| Role             | Permissions                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `platform_admin` | Global superadmin: manages all academies and views multi-tenant billing.                                    |
| `academy_admin`  | Academy manager: full management of staff, athletes, teams, plans, fees, and invoices.                      |
| `coach`          | Team & athlete coach: schedules training sessions, creates plans, logs assessments, runs AI video analyses. |
| `accounting`     | Finance officer: manages fee statuses, records payments, issues invoices.                                   |
| `athlete`        | Student athlete: read-only access to assigned teams, training plans, assessments, and fee balances.         |

Users signing in for the first time without an assigned role or pending invitation are placed on a **Pending Access** screen until an admin grants access.

---

## Getting Started

### 1. Prerequisites

- **Node.js**: `v20.x` or higher (tested with `v24.15.x`)
- **pnpm**: `v9.x` (`npm install -g pnpm@9`)
- **Git**: installed and configured

### 2. Installation

Clone the repository and install dependencies:

```bash
pnpm install
```

### 3. Environment Setup

Copy `.env.example` to `.env.local` if not already present:

```bash
cp .env.example .env.local
```

Configure your environment settings in `.env.local`:

```env
# true = mock mode (no backend needed, demo personas, no real login).
# false = live mode against your Convex deployment.
VITE_LOCAL_DEV=true
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

Backend secrets (Resend, OpenAI, auth keys, admin emails) are set on the Convex
deployment, not in this file. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### 4. Running the Convex Backend

To start the Convex backend locally:

```bash
npx convex dev
```

#### Seeding Initial Data from Snapshot

A complete database snapshot export is included in `archives/snapshot_1788701284051269622.zip` and unpacked in `convex/snapshot/`.
To restore or import all snapshot tables into your Convex deployment:

```bash
npx convex import archives/snapshot_1788701284051269622.zip
```

Or import individual tables from `convex/snapshot/`:

```bash
npx convex import --table academies convex/snapshot/academies/documents.jsonl
npx convex import --table users convex/snapshot/users/documents.jsonl
npx convex import --table athletes convex/snapshot/athletes/documents.jsonl
npx convex import --table teams convex/snapshot/teams/documents.jsonl
```

### 5. Running the Frontend

Start the Vite development server:

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Available Scripts

| Script                 | Command               | Description                                                           |
| ---------------------- | --------------------- | --------------------------------------------------------------------- |
| **Development**        | `pnpm dev`            | Starts the Vite dev server with Hot Module Replacement (HMR)          |
| **Type Check & Build** | `pnpm build`          | Compiles TypeScript (`tsc -b`) and bundles production assets via Vite |
| **Unit Tests**         | `pnpm test`           | Runs Vitest for both Convex edge-runtime and React jsdom environments |
| **Linting**            | `pnpm lint`           | Runs ESLint (`eslint . --max-warnings=0`)                             |
| **Formatting Check**   | `pnpm prettier-check` | Verifies code formatting with Prettier                                |
| **Format Code**        | `pnpm prettier-fix`   | Automatically formats files across the repository                     |
| **Preview**            | `pnpm preview`        | Serves the production build locally                                   |

---

## Testing Guide

Vitest runs two distinct test projects in parallel:

- **`convex`**: Backend functions executed against an in-memory edge runtime using `convex-test`.
- **`frontend`**: React components and hooks tested in a `jsdom` environment using React Testing Library.

Run all tests:

```bash
pnpm test
```
