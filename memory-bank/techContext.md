# Tech Context

## Current Technology Stack

### Backend
- **Framework**: Laravel (PHP)
- **Database**: MySQL with Eloquent ORM
- **Authentication**: Laravel Auth (session-based)
- **File Storage**: Local filesystem (`public/uploads`)
- **PDF Generation**: mpdf library
- **Email**: Laravel Mail with queue system
- **Job Processing**: Laravel Horizon with Redis
- **Testing**: PHPUnit

### Frontend
- **Primary**: Laravel Blade templates
- **Secondary**: Angular components (hybrid approach)
- **Styling**: Custom CSS + Bootstrap components
- **Build**: Laravel Mix (Webpack wrapper)
- **Package Management**: npm + Composer

### Infrastructure
- **Hosting**: Traditional server deployment
- **Database**: MySQL server
- **File Storage**: Local disk storage
- **Queue Workers**: Redis-backed Laravel queues
- **Web Server**: Nginx/Apache

## Target Technology Stack

### Backend/Full-Stack
- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Database**: MySQL (preserve existing schema)
- **ORM**: Kysely (initial) → optional Prisma migration later
- **Authentication**: NextAuth.js with Credentials provider
- **File Storage**: DigitalOcean Spaces (S3-compatible)
- **PDF Generation**: @react-pdf/renderer or Playwright
- **Email**: Resend or SendGrid
- **Background Jobs**: Vercel Cron + API endpoints
- **Testing**: Vitest + Playwright

### Frontend
- **Framework**: React 18+ with Next.js App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React state + Context API
- **Forms**: React Hook Form + Zod validation
- **Build**: Next.js built-in bundling (Turbopack)
- **Package Management**: pnpm

### Infrastructure
- **Hosting**: Vercel (serverless functions)
- **Database**: Existing MySQL (no migration required)
- **File Storage**: DigitalOcean Spaces with CDN
- **Background Jobs**: Vercel Cron (scheduled functions)
- **Monitoring**: Sentry + Vercel Analytics

## Migration Strategy

### Database
- **Approach**: Keep existing MySQL schema unchanged
- **Access Layer**: Replace Eloquent with Kysely for type-safe SQL
- **Connections**: Use connection pooling for serverless environment
- **Migrations**: No structural changes during initial migration

### Authentication
- **Strategy**: Migrate from Laravel sessions to JWT tokens
- **Provider**: NextAuth.js Credentials provider
- **Verification**: bcrypt password verification against existing `users` table
- **Sessions**: JWT with role claims from `employees` table

### File Storage
- **Migration Path**: 
  1. Set up DigitalOcean Spaces bucket
  2. Implement presigned upload URLs for new files
  3. Background migration of existing files from `public/uploads`
  4. Update all file references to use new URLs

### API Endpoints
- **Strategy**: 1:1 mapping of Laravel routes to Next.js API routes
- **Structure**: Maintain same request/response format for compatibility
- **Validation**: Replace Laravel Form Requests with Zod schemas

## Development Tools & Process

### Development Environment
- **Node.js**: v18+ for Next.js compatibility
- **Package Manager**: pnpm for faster installs
- **IDE**: VS Code with TypeScript/React extensions
- **Database**: Local MySQL or connection to staging DB

### Code Quality
- **Linting**: ESLint with Next.js recommended config
- **Formatting**: Prettier with team standards
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Husky for pre-commit checks

### Testing Strategy
- **Unit Tests**: Vitest for utility functions and components
- **Integration Tests**: API route testing with supertest
- **E2E Tests**: Playwright for critical user flows
- **Manual Testing**: Staging environment validation

## Performance Considerations

### Serverless Constraints
- **Function Timeout**: 10-second limit on Vercel Hobby/Pro
- **Memory Limits**: Configure based on operation complexity
- **Cold Starts**: Optimize bundle size and dependencies

### Database Optimization
- **Connection Pooling**: Use serverless-friendly connection management
- **Query Optimization**: Maintain existing indexes, add new ones as needed
- **Caching**: Implement strategic caching for expensive queries

### File Handling
- **Upload Strategy**: Direct client-to-storage with presigned URLs
- **Download Strategy**: Stream from storage through API proxy
- **CDN**: Leverage DigitalOcean Spaces CDN for file delivery

## Security Considerations

### Authentication & Authorization
- **JWT Security**: Proper signing and validation
- **Role-Based Access**: Maintain existing permission structure
- **Session Management**: Secure token refresh and expiration

### Data Protection
- **Input Validation**: Zod schemas for all user inputs
- **SQL Injection**: Kysely's query builder provides protection
- **File Upload Security**: Validate file types and scan for malware

### Infrastructure Security
- **Environment Variables**: Secure secrets management
- **CORS**: Proper cross-origin request handling
- **Rate Limiting**: Implement API rate limiting

## Monitoring & Observability

### Error Tracking
- **Sentry**: Comprehensive error monitoring and alerting
- **Logging**: Structured logging for debugging
- **Performance**: Core Web Vitals and custom metrics

### Analytics
- **Vercel Analytics**: Built-in performance monitoring
- **Custom Events**: Track business-critical user actions
- **Database Monitoring**: Query performance and connection health

Updated: August 28, 2025
