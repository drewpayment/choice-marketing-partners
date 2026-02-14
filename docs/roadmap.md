# Roadmap

Tracking document for plans, epics, and features across the Choice Marketing Partners platform.

---

## Completed

### Employee User Management Improvements
- **Plan:** [2025-10-26-employee-user-management-improvements](plans/2025-10-26-employee-user-management-improvements.md)
- **Status:** Done
- **Summary:** Replaced alert-based password reset with shadcn UI dialogs, enabled post-creation user account creation for employees, consolidated user account management to employee detail pages.
- **Key deliverables:**
  - Removed password reset from employee list view
  - PasswordResetDialog with auto-generate mode
  - CreateUserDialog component for linking new user accounts to employees
  - `POST /api/employees/[id]/create-user` endpoint
  - UserAccountActions card on employee detail page

### Self-Service Password Reset
- **Plan:** [2025-10-28-password-reset](plans/2025-10-28-password-reset.md)
- **Status:** Done
- **Summary:** JWT-based self-service password reset flow with 1-hour token expiration, audit logging, and email delivery via Resend.
- **Key deliverables:**
  - Forgot password page (`/auth/forgot-password`)
  - Reset password page (`/auth/reset-password?token=...`)
  - `POST /api/auth/request-reset` and `POST /api/auth/reset-password` endpoints
  - Password reset email template (React Email)
  - JWT token generation/validation utilities
  - E2E tests (`tests/e2e/password-reset.spec.ts`)
  - "Forgot your password?" link on sign-in page

### Mobile Employee UX Improvements
- **Plan:** [2025-10-29-mobile-employee-ux](plans/2025-10-29-mobile-employee-ux.md)
- **Status:** Done
- **Summary:** Mobile-first responsive design for employees viewing payroll data. Functional hamburger menu, simplified filters, card-based layouts, and collapsible detail views.
- **Key deliverables:**
  - Functional hamburger menu toggle in ClientNavigation
  - Employee ID hidden from employee-role users on dashboard
  - Quick filter presets (All Time, Last 30/90 Days, This Year) for employee payroll
  - Mobile card layout for payroll list (employees)
  - Collapsible sections and sticky header on paystub detail view

---

## In Progress

_No items currently in progress._

---

## Planned

_No items currently planned._

---

## Archive

Historical implementation notes and completed one-off fixes are in [docs/archive/](archive/).
