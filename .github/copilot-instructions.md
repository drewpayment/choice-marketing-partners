# GitHub Copilot Instructions - Choice Marketing Partners

## Architecture Overview

This is a **Next.js 15+ payroll management system** being migrated from Laravel/PHP. The app uses:
- **Database**: MySQL with Kysely ORM (type-safe SQL)
- **Auth**: NextAuth.js with credentials provider + bcrypt
- **Storage**: Vercel Blob for files (migrating from local storage)
- **Build**: Turbopack for fast development builds

## Critical Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (portal)/          # Grouped authenticated routes
│   ├── admin/             # Admin-only pages
│   ├── manager/           # Manager+ access pages
│   └── api/               # API routes
├── lib/
│   ├── database/          # Kysely client & DB types
│   ├── repositories/      # Business logic layer
│   ├── auth/              # NextAuth configuration
│   └── storage/           # Vercel Blob utilities
└── components/            # Reusable UI components
```

## Database Architecture

The system preserves **existing MySQL schema** from Laravel. Key patterns:

- Employee-User relationship via `employee_user` junction table
- Role-based access: `is_admin`, `is_mgr` flags on `employees` table
- Soft deletes: `deleted_at` timestamps, `is_active` flags
- Sales IDs: `sales_id1`, `sales_id2`, `sales_id3` for payroll calculations

## Repository Pattern

Use the **Repository pattern** for all database operations:

```typescript
// Example: src/lib/repositories/EmployeeRepository.ts
export class EmployeeRepository {
  async getEmployees(filters: EmployeeFilters): Promise<EmployeePage> {
    // Complex queries with filtering, pagination, role checks
  }
}
```

**Key repositories**: `EmployeeRepository`, `PayrollRepository`, `InvoiceRepository`, `DocumentRepository`

## Authentication & Authorization

### Middleware Pattern
- `middleware.ts` handles route protection with NextAuth
- Role checks: Admin (`/admin/*`), Manager (`/manager/*`), Employee (default)
- Public routes: `/`, `/blog/*`, `/about-us`, `/comma-club`

### Session Structure
```typescript
session.user = {
  id: string
  email: string
  isAdmin: boolean
  isManager: boolean
  isActive: boolean
  employeeId: number
  salesIds: string[]
}
```

## Development Workflow

### Commands
- `bun dev` - Development with Turbopack
- `bun build` - Production build with Turbopack
- `bun lint` - ESLint checking

### Database Connection
- Uses connection pooling optimized for serverless
- Connection limit: 1 (Vercel function constraint)
- Development logging enabled via `NODE_ENV=development`

## Component Patterns

### shadcn/ui Integration
- Components in `src/components/ui/`
- Tailwind CSS + class-variance-authority for variants
- Form handling: React Hook Form + Zod validation

### Role-Based Rendering
```typescript
{session?.user?.isAdmin && <AdminOnlyComponent />}
{(session?.user?.isAdmin || session?.user?.isManager) && <ManagerComponent />}
```

## API Route Patterns

### Standard Structure
```typescript
// app/api/[resource]/route.ts
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  // Role checking + business logic
  return NextResponse.json(data)
}
```

### Role Filtering
- All queries filter by user role and employee relationships
- Admin: sees all data
- Manager: sees assigned employees only
- Employee: sees personal data only

## File Storage Migration

### Current Pattern
- Legacy files in `public/uploads/`
- New files use Vercel Blob with presigned URLs
- Download proxy through API routes for access control

### Upload Flow
```typescript
// Generate presigned URL
const { url, downloadUrl } = await put(filename, file, { access: 'public' })
// Store downloadUrl in database
```

## Memory Bank Context

The `memory-bank/` directory contains project documentation:
- `activeContext.md` - Current development phase and focus
- `systemPatterns.md` - Architecture patterns and migration strategy  
- `productContext.md` - Business requirements and user roles
- `techContext.md` - Technology stack and infrastructure details

## Key Business Rules

1. **Payroll Access**: Strictly controlled by employee-manager relationships
2. **Invoice Changes**: Trigger automatic paystub recalculation
3. **Role Hierarchy**: Admin > Manager > Employee with cascading permissions
4. **Data Isolation**: Users only see data they're authorized for (no global queries)
5. **Audit Trail**: All financial changes must be trackable

## Common Patterns to Follow

- Use `getServerSession(authOptions)` for auth in API routes and Server Components
- Implement role-based filtering in all repository methods
- Preserve MySQL schema - NO structural database changes
- Use TypeScript strict mode with proper Kysely types
- Handle soft deletes consistently across all entities

## Testing Considerations

- Database operations use transactions for consistency
- Role-based access testing is critical for security
- File upload/download workflows need comprehensive testing
- Migration compatibility between Laravel and Next.js must be verified