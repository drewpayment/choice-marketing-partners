# System Patterns

## Architecture Patterns

### Current Laravel Patterns
- **MVC Structure**: Controllers → Models → Views
- **Route-based API**: RESTful endpoints with Laravel routing
- **Eloquent ORM**: Database interactions with active record pattern
- **Blade Templating**: Server-side rendering with PHP templates
- **Laravel Auth**: Session-based authentication with middleware
- **Queue Jobs**: Background processing for heavy operations

### Target Next.js Patterns
- **App Router**: File-based routing with nested layouts
- **Server Components**: SSR for data fetching and initial renders
- **API Routes**: RESTful endpoints in `app/api` directory
- **Prisma/Kysely**: Type-safe database queries
- **NextAuth.js**: JWT-based authentication with middleware
- **Vercel Functions**: Serverless API endpoints

## Data Access Patterns

### Current (Laravel)
```php
// Controller pattern
class PayrollController extends Controller {
    public function index(Request $request) {
        $paystubs = Paystub::whereHas('employee', function($query) {
            $query->where('manager_id', auth()->id());
        })->get();
        return view('payroll.index', compact('paystubs'));
    }
}
```

### Target (Next.js)
```typescript
// Server Component pattern
export default async function PayrollPage() {
    const session = await getServerSession(authOptions);
    const paystubs = await getPaystubsForUser(session.user.id, session.user.role);
    return <PayrollList paystubs={paystubs} />;
}
```

## Security Patterns

### Role-Based Access Control
- **Current**: Laravel middleware + session checks
- **Target**: NextAuth middleware + JWT claims

### Data Filtering
- **Current**: Eloquent scopes based on user relationships
- **Target**: Database queries with user context filtering

## File Handling Patterns

### Current (Local Storage)
```php
Storage::disk('public')->put($filename, $file);
return response()->download($path);
```

### Target (Object Storage)
```typescript
// Presigned upload to S3/DO Spaces
const uploadUrl = await generatePresignedUpload(filename);
// Client uploads directly to storage
```

## Background Job Patterns

### Current (Laravel Queues)
```php
ProcessPaystubJob::dispatch($date, $employeeIds);
```

### Target (Vercel Cron + API)
```typescript
// api/cron/process-payroll/route.ts
export async function POST() {
    // Process in chunks to stay within serverless limits
    await processPayrollBatch(date, batchSize);
}
```

## Error Handling Patterns

### Global Error Boundaries
- Client-side: React Error Boundaries
- Server-side: Next.js error pages
- API: Consistent error response format

### Validation Patterns
- **Current**: Laravel Form Requests
- **Target**: Zod schemas for runtime validation

## State Management Patterns

### Server State
- **Current**: Blade templates with passed data
- **Target**: Server Components with direct DB access

### Client State
- **Current**: Angular services and components
- **Target**: React state + Context for complex interactions

### Form State
- **Current**: Laravel forms with CSRF
- **Target**: React Hook Form + Server Actions

## Database Query Patterns

### Relationship Loading
```typescript
// Eager loading with role-based filtering
const invoices = await db
    .selectFrom('invoices')
    .innerJoin('employees', 'employees.id', 'invoices.employee_id')
    .where(getEmployeeAccessFilter(userId, userRole))
    .selectAll()
    .execute();
```

### Pagination
```typescript
// Cursor-based pagination for performance
const { data, nextCursor } = await getPaginatedPaystubs({
    cursor: searchParams.cursor,
    limit: 20,
    userId,
    userRole
});
```

## Caching Patterns

### Static Generation
- Public pages (blog, about) - ISR
- User dashboards - Dynamic rendering
- API responses - Edge caching where appropriate

### Database Caching
- Connection pooling with PgBouncer-style approach
- Query result caching for expensive operations

Updated: August 28, 2025
