# Choice Marketing Partners

Payroll management system for Choice Marketing Partners, migrated from a legacy Laravel/PHP application to a modern Next.js stack. Handles employee payroll, invoices, commissions, document management, and vendor tracking.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict mode)
- **Database:** MySQL with [Kysely](https://kysely.dev/) ORM
- **Auth:** NextAuth.js (credentials + bcrypt)
- **Storage:** Vercel Blob (new uploads), legacy `public/uploads/` (read-only)
- **UI:** Tailwind CSS 4 + shadcn/ui + Radix primitives
- **Email:** Resend + React Email
- **Hosting:** Vercel

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 24+
- MySQL database
- Copy `.env.example` to `.env.local` and fill in required values

### Development

```bash
bun install           # Install dependencies
bun dev               # Start dev server (Turbopack)
```

Open [http://localhost:3000](http://localhost:3000).

### Testing

```bash
bun test              # Unit tests (Jest)
bun test:e2e          # E2E tests (Playwright)
bun test:e2e:headed   # E2E with visible browser
bun test:e2e:ui       # Interactive Playwright UI
bun test:coverage     # Coverage report
```

### Build

```bash
bun build             # Production build
bun start             # Start production server
```

## Project Structure

```
src/
  app/                # Next.js App Router
    (portal)/         # Protected authenticated routes
    admin/            # Admin-only pages
    manager/          # Manager+ access pages
    api/              # API routes
  lib/
    database/         # Kysely client & auto-generated types
    repositories/     # Business logic layer (repository pattern)
    auth/             # NextAuth configuration
    storage/          # Vercel Blob utilities
  components/         # React components (shadcn/ui)
tests/                # E2E Playwright tests
docs/                 # Roadmap, plans, and archive
```

## Architecture

- **Repository pattern** for all database access (`src/lib/repositories/`)
- **Role-based access control:** Admin > Manager > Employee
- **Route protection** via `middleware.ts` with role-scoped layouts
- **Self-service password reset** with JWT tokens and email delivery
- **Dual file storage** (Vercel Blob for new uploads, legacy filesystem for migrated files)

See [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) for deployment and environment variable configuration.

## Documentation

- [`docs/roadmap.md`](docs/roadmap.md) — Feature roadmap and completed work
- [`docs/plans/`](docs/plans/) — Implementation plans for features
- [`docs/archive/`](docs/archive/) — Historical implementation notes
