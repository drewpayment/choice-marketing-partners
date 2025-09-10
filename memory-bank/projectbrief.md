# Project Brief: Laravel to Next.js Migration

## Overview
Converting a comprehensive Laravel application with Angular components to a modern Next.js 14+ SSR application on Vercel while maintaining full functionality and data integrity.

## Business Context
- **Current State**: PHP Laravel backend + Angular frontend hybrid with MySQL database
- **Target State**: Next.js 14+ App Router with SSR, TypeScript, deployed on Vercel
- **Core Requirement**: Zero data loss, maintain all existing functionality

## Key Stakeholders
- Development team implementing migration
- End users accessing payroll, invoices, documents, and admin features
- Business operations dependent on continuous service availability

## Success Criteria
1. All existing features functional in Next.js
2. Performance equal or better than current system
3. Zero data loss during migration
4. Seamless user experience transition
5. Improved developer experience with modern stack

## Technical Constraints
- Must preserve existing MySQL schema (no structural changes)
- Must maintain role-based access control (Admin/Manager/Employee)
- Must handle file uploads/downloads (migrate to object storage)
- Must generate PDFs (replace mpdf with modern solution)
- Must send emails (replace Laravel mail with modern provider)

## Timeline
- **Target Duration**: 14 weeks
- **Critical Path**: Foundations → Public → Payroll → Invoices → Admin → Documents → Agents/Overrides → Cutover
- **Go-Live**: Planned phased rollout with staging validation

## Risk Tolerance
- **Low Risk**: Data integrity, user access control, financial calculations
- **Medium Risk**: File storage migration, PDF generation changes
- **High Risk**: Performance optimization, new technology adoption

Created: August 28, 2025
