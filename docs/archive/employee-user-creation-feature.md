# Employee User Account Creation Feature

## Overview
Enhanced employee creation flow to support optional user account creation with automatic password generation and email notification.

## Implementation Date
October 17, 2025

## Features Implemented

### 1. Auto-Generated Passwords
- **Location**: `src/lib/utils/password.ts`
- **Function**: `generatePassword(length: number = 10)`
- **Default Length**: 10 characters (matches legacy Laravel `str_random(10)`)
- **Character Set**: Alphanumeric only (a-z, A-Z, 0-9)
- **Security**: Uses `crypto.getRandomValues()` for cryptographically secure random generation
- **Validation**: `isValidPassword()` enforces minimum 8 characters for manual passwords

### 2. Email Notification Service
- **Location**: `src/lib/services/email.ts`
- **Function**: `sendWelcomeEmail(params)`
- **Current State**: Logs email details to console (ready for email provider integration)
- **Email Content**:
  - Employee name
  - Login email
  - Generated password
  - Login URL
  - Instructions to change password
- **Future Integration**: Ready for SendGrid, Resend, or other email providers

### 3. API Route Updates
- **Location**: `src/app/api/employees/route.ts`
- **Changes**:
  - Password is now **optional** when `createUser: true`
  - Auto-generates 10-character password if not provided
  - Sends welcome email after successful user creation
  - Returns `generatedPassword` in response (one-time display)
  - Email errors don't fail employee creation (logged only)

### 4. Frontend Form Enhancements
- **Location**: `src/components/employees/EmployeeForm.tsx`
- **Changes**:
  - Removed password input field (auto-generated)
  - Added success message card with generated password
  - Password display with copy-to-clipboard button
  - User role selection still available
  - Clear messaging about email notification
  - Warning that password won't be shown again

## User Flow

### Admin Creates Employee with User Account

1. Admin navigates to `/admin/employees/create`
2. Fills in employee information (name, email, address, etc.)
3. Toggles "Create User Account" switch
4. Selects user role (subscriber/author/admin)
5. Submits form
6. System:
   - Creates employee record
   - Generates 10-character password
   - Creates user record with hashed password
   - Links employee to user via `employee_user` table
   - Sends welcome email to employee
   - Shows success message with generated password to admin
7. Admin:
   - Copies password (optional - also emailed to employee)
   - Returns to employee list

## Database Schema

### Tables Updated
- `employees`: Core employee data
- `users`: Authentication credentials
- `employee_user`: Junction table linking employees to users

### Password Storage
- Hashed using bcrypt with 12 rounds
- Original password never stored
- Matches existing security patterns

## Testing

### Unit Tests
- **File**: `src/__tests__/utils/password.test.ts`
- **Coverage**: 7 tests, all passing
- **Tests**:
  - Default length (10 characters)
  - Custom length
  - Alphanumeric characters only
  - Uniqueness (different each time)
  - Character variety (uppercase, lowercase, numbers)
  - Validation for 8+ character requirement

## Security Considerations

1. **Password Generation**:
   - Uses cryptographically secure random generation
   - 10 characters = ~60 bits of entropy
   - Alphanumeric only for compatibility

2. **Password Storage**:
   - Bcrypt with 12 rounds
   - Never stored in plaintext
   - Only shown once to admin

3. **Email Transmission**:
   - TODO: Implement TLS/SSL for email provider
   - Encourage password change on first login

4. **One-Time Display**:
   - Password only returned in initial API response
   - Not retrievable afterward
   - Admin must save if needed

## Migration from Legacy

### Legacy Pattern (Laravel)
```php
$random = str_random(10);
$user->password = bcrypt($random);
```

### New Pattern (Next.js)
```typescript
const generatedPassword = generatePassword(10)
// ... create user with bcrypt.hash(generatedPassword, 12)
```

### Compatibility
- ✅ Same password length (10 characters)
- ✅ Same character set (alphanumeric)
- ✅ Same hashing (bcrypt)
- ✅ Backward compatible with existing user records

## Future Enhancements

### Email Service Integration
Currently logs to console. To integrate with real email service:

```typescript
// Example with Resend
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)

const { data, error } = await resend.emails.send({
  from: 'noreply@choicemarketing.com',
  to: params.to,
  subject: 'Welcome to Choice Marketing Partners',
  html: welcomeEmailTemplate({ name: params.name, password: params.password })
})
```

### Password Reset Flow
The email service includes `sendPasswordResetEmail()` ready for implementation:
- Generate reset token
- Send email with reset link
- Verify token and allow password change

### Force Password Change
- Add `must_change_password` flag to users table
- Redirect to password change on first login
- Improve security by expiring generated passwords

## Configuration

### Environment Variables Needed
```env
# Email Service (when implemented)
RESEND_API_KEY=re_xxx
SMTP_HOST=smtp.example.com
SMTP_USER=user@example.com
SMTP_PASS=password

# Application URL (for email links)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Documentation References
- Password Utility: `src/lib/utils/password.ts`
- Email Service: `src/lib/services/email.ts`
- Employee Repository: `src/lib/repositories/EmployeeRepository.ts`
- API Route: `src/app/api/employees/route.ts`
- Frontend Form: `src/components/employees/EmployeeForm.tsx`
- Tests: `src/__tests__/utils/password.test.ts`
