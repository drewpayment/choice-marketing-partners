# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Next.js 15+ payroll management system** migrating from Laravel/PHP. The application manages employee payroll, invoices, commissions, and document management for Choice Marketing Partners.

**Tech Stack**:
- Next.js 15 with App Router + Turbopack
- TypeScript (strict mode)
- MySQL database with Kysely ORM (type-safe SQL)
- NextAuth.js (credentials + bcrypt)
- Vercel Blob Storage
- Tailwind CSS + shadcn/ui components

## Development Commands

### Running the Application
```bash
bun dev              # Development server with Turbopack
bun build            # Production build with Turbopack
bun start            # Production server
bun lint             # ESLint checking
```

### Testing
```bash
# Unit tests (Jest)
bun test             # Run all unit tests
bun test:watch       # Watch mode
bun test:coverage    # Coverage report
bun test:ci          # CI mode

# E2E tests (Playwright)
bun test:e2e                 # Run all E2E tests
bun test:e2e:headed          # Run with visible browser
bun test:e2e:ui              # Interactive UI mode
bun test:e2e:debug           # Debug mode
bun test:e2e basic.spec.ts   # Run specific test file
bun test:e2e:report          # View HTML report
bun test:install             # Install Playwright browsers
```

**Test Structure**:
- Unit tests: `src/**/__tests__/**/*.{test,spec}.{ts,tsx}`
- E2E tests: `tests/**/*.spec.ts` (Playwright)
- Test database users: `admin@test.com`, `manager@test.com`, `employee@test.com` (all use `password123`)

## Critical Architecture Patterns

### Directory Structure
```
choice-marketing-partners/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (portal)/          # Protected authenticated routes
│   │   ├── admin/             # Admin-only pages
│   │   ├── manager/           # Manager+ access pages
│   │   └── api/               # API routes
│   ├── lib/
│   │   ├── database/          # Kysely client & auto-generated types
│   │   ├── repositories/      # Business logic layer (USE THIS)
│   │   ├── auth/              # NextAuth configuration
│   │   ├── storage/           # Vercel Blob utilities
│   │   └── utils/             # Shared utilities
│   └── components/            # React components
├── tests/                     # E2E Playwright tests
├── memory-bank/              # Project context documentation
└── legacy/                   # Old Laravel application (reference only)
```

### Repository Pattern (REQUIRED)

**Always use repositories for database operations** - never write raw SQL queries in API routes or components.

Key repositories in `src/lib/repositories/`:
- `EmployeeRepository.ts` - Employee management, user linking, role checks
- `PayrollRepository.ts` - Payroll calculations, paystubs, commission tracking
- `InvoiceRepository.ts` - Invoice management and audit trails
- `DocumentRepository.ts` - File uploads/downloads with access control
- `VendorRepository.ts` - Vendor/sales management

Example pattern:
```typescript
// ❌ Don't write SQL in API routes
await db.selectFrom('employees').where('id', '=', id).execute()

// ✅ Use repository methods
const employeeRepo = new EmployeeRepository()
await employeeRepo.getEmployeeById(id, session.user)
```

### Authentication & Authorization

Session structure (from NextAuth):
```typescript
session.user = {
  id: string           // User UID
  email: string
  isAdmin: boolean     // Admin access flag
  isManager: boolean   // Manager access flag
  isActive: boolean    // Account active status
  employeeId: number   // Linked employee ID
  salesIds: string[]   // Sales IDs for commission tracking
}
```

**Role-based access hierarchy**: Admin > Manager > Employee

All API routes and server components must:
1. Check session: `const session = await getServerSession(authOptions)`
2. Validate role permissions before operations
3. Filter data by user role (repositories handle this automatically)

Route protection handled by `middleware.ts`:
- Public routes: `/`, `/blog/*`, `/about-us`, `/comma-club`
- Protected routes: Everything else requires authentication
- Admin routes: `/admin/*`
- Manager routes: `/manager/*`

### Password Reset Flow

**Self-service password reset** with JWT tokens:
- Request: `POST /api/auth/request-reset` (validates active user, sends email)
- Reset: `POST /api/auth/reset-password` (validates token, updates password)
- Token expiration: 1 hour
- Audit logging: All requests logged to `password_resets` table
- Email delivery: Resend API

**UI Flow**:
1. User clicks "Forgot password?" on sign in page
2. Enters email at `/auth/forgot-password`
3. Receives email with reset link
4. Clicks link → `/auth/reset-password?token=...`
5. Enters new password
6. Redirected to sign in page

**Security**:
- JWT signed with `NEXTAUTH_SECRET`
- Only active accounts can reset (`is_active = 1`)
- Prevents email enumeration (same message for existing/non-existing emails)
- Password minimum 8 characters

### Database Architecture

**CRITICAL**: Preserve existing MySQL schema from Laravel migration - do NOT make structural database changes.

Key patterns:
- **Employee-User linking**: Via `employee_user` junction table
- **Role flags**: `is_admin`, `is_mgr` on `employees` table
- **Soft deletes**: `deleted_at` timestamps, `is_active` flags
- **Sales tracking**: `sales_id1`, `sales_id2`, `sales_id3` for payroll calculations
- **Manager assignments**: `manager_employees` table for employee relationships

Database client configuration (`src/lib/database/client.ts`):
- Connection pooling optimized for serverless (limit: 1)
- Supports `DATABASE_URL` or individual env vars
- Development query logging enabled
- Type-safe queries via Kysely with auto-generated types

### Type Generation

Database types are auto-generated in `src/lib/database/types.ts` using kysely-codegen. When schema changes:
```bash
bun run kysely-codegen
```

All database operations are fully type-safe through the `DB` interface.

### File Storage Migration Pattern

**Dual storage system** during migration:
- Legacy files: `public/uploads/` (read-only)
- New uploads: Vercel Blob with presigned URLs
- Access control: Download proxy through API routes

Upload flow:
```typescript
import { put } from '@vercel/blob'

const { url, downloadUrl } = await put(filename, file, { access: 'public' })
// Store downloadUrl in database
```

### API Route Pattern

Standard structure for all API routes:
```typescript
// app/api/[resource]/route.ts
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  // Role-based authorization
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use repository pattern
  const repo = new ResourceRepository()
  const data = await repo.getData(filters, session.user)

  return NextResponse.json(data)
}
```

**IMPORTANT**: All queries must filter by user role and relationships - no global queries.

### Component Patterns

**shadcn/ui Integration**:
- UI components in `src/components/ui/`
- Tailwind CSS with class-variance-authority for variants
- Forms: React Hook Form + Zod validation

**Role-based rendering**:
```typescript
{session?.user?.isAdmin && <AdminOnlyComponent />}
{(session?.user?.isAdmin || session?.user?.isManager) && <ManagerComponent />}
```

## Environment Variables

Required in `.env.local` (see `.env.example`):
```bash
DATABASE_URL="mysql://user:password@localhost:3306/choice_marketing"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"
BLOB_READ_WRITE_TOKEN="vercel-blob-token"
RESEND_API_KEY="resend-email-key"
NEXT_PUBLIC_POSTHOG_KEY="analytics-key"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
```

## Business Rules & Constraints

1. **Payroll access**: Strictly controlled by employee-manager relationships
2. **Invoice changes**: Trigger automatic paystub recalculation
3. **Data isolation**: Users only see data they're authorized for
4. **Audit trails**: All financial changes must be trackable
5. **MySQL compatibility**: No PostgreSQL-specific features (no RETURNING clause, etc.)

## Migration Context

This is an active **Laravel → Next.js migration**. Reference `memory-bank/` for:
- `activeContext.md` - Current development phase (Phase 8 cutover planning)
- `systemPatterns.md` - Architecture patterns and migration strategy
- `productContext.md` - Business requirements and user roles
- `techContext.md` - Technology stack details

**Current Status**: Core functionality complete (Phases 0-7), preparing for production cutover.

## TypeScript Configuration

- Path alias: `@/*` maps to `src/*`
- Strict mode enabled
- Target: ES2017
- Tests excluded from main compilation

## Common Pitfalls

1. **Don't skip repositories** - Always use the repository pattern for database queries
2. **MySQL syntax only** - No PostgreSQL features (avoid RETURNING, etc.)
3. **Connection pooling** - Serverless environment has connection limit of 1
4. **Soft deletes** - Check `deleted_at` and `is_active` when querying
5. **Role filtering** - Never write queries that bypass role-based access control
6. **Next.js 15 params** - Params are async in route handlers: `const params = await request.params`
