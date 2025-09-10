# Product Context

## Current Application Features

### Core Business Functions
1. **Payroll Management**
   - Role-based paystub access (Admin/Manager/Employee)
   - PDF generation and email distribution
   - Search and filtering capabilities
   - Dispute handling workflow

2. **Invoice Processing**
   - Bulk invoice upload and management
   - Sales, overrides, and expense tracking
   - Automatic paystub recalculation
   - Delete and bulk operations

3. **Document Management**
   - File upload/download system
   - Tagging and categorization
   - Bulk operations and search
   - Access control per user role

4. **Employee/Agent Administration**
   - CRUD operations for agents
   - Manager-employee relationship management (overrides)
   - Role assignment and permissions
   - Password reset functionality

5. **Company Administration**
   - Payroll settings and restrictions
   - Company options configuration
   - Release time management
   - Payroll monitoring and tracking

6. **Public Website & Blog**
   - Company information pages
   - Blog with comments system
   - Testimonials and awards (Comma Club)
   - SEO-optimized content

## User Roles & Permissions
- **Admin**: Full system access, company settings, all employees
- **Manager**: Limited admin access, assigned employees only
- **Employee**: Personal payroll and documents only
- **Public**: Anonymous access to public pages and blog

## Technical Architecture (Current)
- **Backend**: PHP Laravel with MySQL
- **Frontend**: Mix of Laravel Blade templates and Angular components
- **File Storage**: Local filesystem (`public/uploads`)
- **PDF Generation**: mpdf library
- **Email**: Laravel Mail with queue system
- **Authentication**: Laravel Auth with session-based security

## Key Business Rules
1. Paystub access strictly controlled by employee relationships
2. Invoice changes trigger automatic paystub recalculation
3. Documents require tagging for organization
4. Payroll release times enforced via company settings
5. All financial data changes must be auditable
6. Manager-employee relationships control data visibility

## Integration Points
- MySQL database (preserve schema)
- File upload/download workflows
- PDF generation for paystubs
- Email notifications for payroll
- Role-based UI rendering

Updated: August 28, 2025
