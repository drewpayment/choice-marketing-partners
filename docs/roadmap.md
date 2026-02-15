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

### Landing Page Redesign
- **Plan:** [2026-02-14-landing-page-redesign](plans/2026-02-14-landing-page-redesign.md)
- **Status:** Done
- **Summary:** Redesigned the root landing page with a new Blue-Teal & Amber deuteranopia-safe color system, modern layout with shadcn/ui components, and updated CSS custom properties.
- **Key deliverables:**
  - CSS custom properties updated to Blue-Teal & Amber oklch tokens
  - Landing page rewritten with sticky nav, gradient hero, features grid, CTA sections
  - TestimonialSection restyled with design tokens
  - Geist font family with warm stone neutrals

### Portal & Admin Section Redesign
- **Plan:** [2026-02-14-portal-admin-redesign](plans/2026-02-14-portal-admin-redesign.md)
- **Status:** Done
- **Summary:** Replaced all hardcoded Tailwind color classes with design system tokens across 50+ files. Upgraded employee dashboard with shadcn Card components and Lucide icons. Established consistent Blue-Teal & Amber color system across the entire portal and admin section.
- **Key deliverables:**
  - Design token replacement across 52 files (580+ class instances)
  - Employee dashboard upgraded with shadcn Cards and Lucide icons
  - ClientNavigation restyled with design tokens
  - AdminSidebar restyled with design tokens
  - All admin sub-pages using consistent design tokens
  - Auth, blog, and static pages updated
  - Deuteranopia-safe status indicators (color + icon pairs)

---

## In Progress

_No items currently in progress._

---

## Planned

_No items currently planned._

---

## Archive

Historical implementation notes and completed one-off fixes are in [docs/archive/](archive/).
