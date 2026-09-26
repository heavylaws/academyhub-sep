# PeakForm Athletics — Project Walkthrough

## What Is This App?

**PeakForm Athletics** is a sports academy management platform. It is built for academies that manage coaches, athletes, training, and finances in one place.

Think of it as a back-office tool for a sports academy: staff log in, manage their rosters, schedule sessions, track attendance, write training plans, run AI video analysis on athletes, and handle billing — all in one app.

---

## Who Uses It (Roles)

| Role             | What they can do                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `platform_admin` | Manages all academies on the platform. Sees billing overview across all clients.                              |
| `academy_admin`  | Runs their own academy. Full access to staff, athletes, teams, finance, invoices.                             |
| `coach`          | Manages athletes and teams they are assigned to. Can create sessions, plans, assessments, and video analyses. |
| `accounting`     | Finance-only access. Can manage fees and invoices but not athlete/team data.                                  |
| `athlete`        | Read-only view of their own profile, their team sessions, training plans, and fees.                           |

New users who sign in but have no role assigned are shown a **Pending Access** screen until an admin assigns them a role.

---

## Tech Stack

| Layer    | Technology                                            |
| -------- | ----------------------------------------------------- |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, shadcn/ui |
| Backend  | Convex (serverless functions + reactive database)     |
| Auth     | Hercules Auth (managed OIDC)                          |
| Email    | Hercules Email (fee notifications)                    |
| AI       | Hercules AI Gateway → OpenAI (video analysis)         |
| Fonts    | Space Grotesk (headings), Manrope (body)              |

---

## Database Tables

| Table               | Purpose                                                                    |
| ------------------- | -------------------------------------------------------------------------- |
| `users`             | Platform users. Stores role and linked academy.                            |
| `academies`         | Academy organisations (name, slug, status).                                |
| `invites`           | Email invitations for new staff.                                           |
| `athletes`          | Athlete profiles (name, DOB, sport, height, weight, contact, guardian).    |
| `teams`             | Sports teams within an academy.                                            |
| `teamMembers`       | Join table linking athletes to teams.                                      |
| `trainingSessions`  | Scheduled sessions for a team (title, start time, duration, location).     |
| `attendanceRecords` | Per-athlete attendance status for a session (present/late/excused/absent). |
| `trainingPlans`     | Named training programs assigned to individual athletes.                   |
| `planItems`         | Individual exercises within a plan (sets, reps, duration, results).        |
| `assessments`       | Performance data points for an athlete (metric name, value, unit, date).   |
| `videoAnalyses`     | AI video analysis records (stored video file + AI-generated feedback).     |
| `athleteFees`       | Fee records assigned to athletes (amount, due date, status).               |
| `feePayments`       | Payment entries recorded against a fee.                                    |
| `invoices`          | Formal invoices (numbered INV-XXXX) with status lifecycle.                 |

---

## Pages and Routes

### Public / Auth

| Route            | What it shows                                                          |
| ---------------- | ---------------------------------------------------------------------- |
| `/`              | Landing page for unauthenticated users. Dashboard for logged-in users. |
| `/auth/callback` | Handles the Hercules Auth sign-in redirect. Do not edit.               |

### Admin (platform_admin only)

| Route              | What it shows                                                        |
| ------------------ | -------------------------------------------------------------------- |
| `/admin/academies` | List and manage all academies on the platform.                       |
| `/admin/billing`   | Billing overview across all academies (invoices, totals by academy). |

### Staff and Athletes

| Route                  | What it shows                                                                 |
| ---------------------- | ----------------------------------------------------------------------------- |
| `/staff`               | List of staff users in the academy. Invite new staff by email.                |
| `/athletes`            | Athlete roster. Search, filter, add athletes, bulk import via CSV.            |
| `/athletes/:athleteId` | Full athlete profile: bio, plans, attendance, assessments, AI video analysis. |

### Teams and Sessions

| Route                  | What it shows                                                             |
| ---------------------- | ------------------------------------------------------------------------- |
| `/teams`               | All teams in the academy. Create and manage teams.                        |
| `/teams/:teamId`       | Team detail: roster management, upcoming and past sessions.               |
| `/sessions/:sessionId` | Session detail: date/time/location, live attendance tracking per athlete. |

### Training Plans

| Route            | What it shows                                                                 |
| ---------------- | ----------------------------------------------------------------------------- |
| `/plans/:planId` | Training plan detail: exercise list, sets/reps, mark items complete, reorder. |

### Finance

| Route              | What it shows                                                        |
| ------------------ | -------------------------------------------------------------------- |
| `/finance`         | Academy admin/accounting view of all athlete fees. Filter by status. |
| `/finance/my-fees` | Athlete's own fee history and payment status.                        |
| `/invoices`        | Formal invoice management (create, update status, delete).           |

---

## Features: What Is Done

### Authentication & Onboarding

- [x] Sign in via Hercules Auth (Google, email, etc.)
- [x] Role-based access control on all routes
- [x] Pending access screen for new users without a role
- [x] Staff invite flow via email

### Dashboard

- [x] Role-tailored dashboard (different data for admin/coach vs athlete)
- [x] Upcoming sessions, recent assessments, team summary
- [x] Athlete dashboard shows their own teams, plans, assessments

### Athletes

- [x] Create, edit, deactivate/reactivate athletes
- [x] Bulk import athletes from CSV
- [x] Full profile page (bio, contact, guardian info)
- [x] Search/filter athlete list

### Teams

- [x] Create and manage teams
- [x] Add/remove athletes from team roster
- [x] View upcoming and past sessions per team

### Training Sessions

- [x] Schedule sessions for a team (title, date, duration, location)
- [x] Edit and delete sessions
- [x] Live attendance tracking per session (present / late / excused / absent)
- [x] Attendance stats per athlete (rate, recent history)
- [x] Academy-wide attendance leaderboard (top and bottom 5 athletes)

### Training Plans

- [x] Create named training plans for individual athletes
- [x] Add/edit/delete exercises (sets, reps, duration)
- [x] Drag-to-reorder exercises
- [x] Mark exercises complete and record results
- [x] Plan status: active / completed / archived

### Performance Assessments

- [x] Record arbitrary metrics per athlete (e.g. "Sprint 40m", "Vertical Jump")
- [x] Delete individual data points
- [x] Charts showing metric trends over time (recharts)

### AI Video Analysis

- [x] Upload a video of an athlete
- [x] Client extracts 4 frames from the video
- [x] Backend sends frames to OpenAI via Hercules AI Gateway
- [x] Returns structured feedback: summary, strengths, improvements, metrics, recommendations
- [x] View and delete past analyses per athlete

### Finance — Fees

- [x] Create fee records for athletes (label, amount, currency, due date)
- [x] Fee statuses: unpaid / paid / overdue / waived
- [x] Record payments against fees
- [x] Delete fees (removes all payment history too)
- [x] Email notification to athlete on fee creation, status change, and payment
- [x] Athlete view of their own fees (`/finance/my-fees`)
- [x] Summary cards showing counts by status

### Finance — Invoices

- [x] Create formal invoices with auto-generated numbers (INV-0001, INV-0002, …)
- [x] Optionally link invoice to a specific athlete
- [x] Status lifecycle: draft → sent → paid → overdue
- [x] Delete invoices
- [x] Filter invoices by status
- [x] Platform admin billing overview across all academies

### Admin

- [x] Platform admin can view and manage all academies
- [x] Platform admin billing dashboard

---

## Features: Pending / In Progress

| Feature                        | Status      | Notes                                                                                                         |
| ------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------- |
| PDF athlete performance report | Not started | Exportable PDF summarising an athlete's assessments, plans, and attendance. Active milestone in initiative-2. |

---

## Features: Missing or Not Yet Built

These are gaps identified from the current codebase — things that would logically belong in this app but are not implemented yet:

| Feature                         | Notes                                                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Athlete ↔ user account linking  | Athletes exist as records but there is no flow to automatically link an athlete record to their own logged-in user account. The `userId` field on athletes exists in the schema but is never set at sign-up. |
| Staff role management UI        | Staff can be invited but their role cannot be changed from the UI after the invite is accepted.                                                                                                              |
| Calendar / schedule view        | Sessions are listed but there is no calendar UI (weekly/monthly view).                                                                                                                                       |
| Push notifications              | No push notification support. Fee emails work but no in-app or push alerts.                                                                                                                                  |
| Payment gateway integration     | Fees and invoices are tracked manually. No way for an athlete to actually pay online.                                                                                                                        |
| Recurring fees / billing cycles | Fees are created one at a time. No automation for monthly or term fees.                                                                                                                                      |
| Export to CSV                   | No data export for fees, athlete lists, attendance reports, etc.                                                                                                                                             |
| Photo / avatar for athletes     | Athletes have initials-based avatars only. No photo upload.                                                                                                                                                  |
| In-app notifications            | No activity feed or notification system for events (new session, plan update, etc.).                                                                                                                         |

---

## File Structure Summary

```
convex/               Backend functions and database schema
  schema/             Individual table schemas (one file per domain)
  athletes.ts         Athlete CRUD and queries
  trainingSessions.ts Session scheduling and attendance
  trainingPlans.ts    Plans and plan items
  assessments.ts      Performance data points
  videoAnalyses.ts    AI video upload and analysis
  fees.ts             Athlete fee management
  invoices.ts         Invoice management
  dashboard.ts        Role-specific dashboard query
  emails.ts           Fee notification emails
  videoAnalysis.ts    Node.js action that calls OpenAI

src/pages/
  Index.tsx           Root route (landing page or dashboard)
  Dashboard.tsx       Dashboard UI
  athletes/           Athlete list, detail page, and sub-components
  teams/              Team list and team detail
  sessions/           Session detail with live attendance
  finance/            Fee management and athlete fee view
  invoices/           Invoice management
  staff/              Staff list and invite flow
  admin/              Platform admin pages

src/components/
  ui/                 shadcn/ui component library
  layout/             App shell (sidebar + top nav)
  auth/               Protected route wrapper
```

---

## Key Design Decisions

- **Academy-scoped data**: every table has an `academyId`. All queries are scoped to the caller's academy — users cannot see data from other academies.
- **Role checks on the backend**: every mutation and query calls `requireRole()` or `requireAcademyMember()` server-side. Frontend role checks are display-only.
- **AI analysis is async**: video analysis runs as a background Convex action (Node.js runtime). The UI shows an "analyzing" status and updates reactively when complete.
- **Email on fee events**: creating a fee, changing its status, and recording a payment each trigger a scheduled email action to notify the athlete.
- **No online payments**: the finance module is a manual ledger. Payment processing is not integrated.
