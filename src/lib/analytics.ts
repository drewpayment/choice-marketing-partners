import { trackEvent, identifyUser, resetUser } from '@/components/posthog-provider'

// User authentication events
export const analytics = {
  // Authentication
  userLogin: (userId: string, userRole: 'admin' | 'manager' | 'employee') => {
    identifyUser(userId, {
      role: userRole,
      login_timestamp: new Date().toISOString(),
    })
    trackEvent('user_login', { role: userRole })
  },

  userLogout: () => {
    trackEvent('user_logout')
    resetUser()
  },

  // Payroll-specific events
  payrollViewed: (payrollId: string, employeeId?: string) => {
    trackEvent('payroll_viewed', {
      payroll_id: payrollId,
      employee_id: employeeId,
    })
  },

  invoiceCreated: (invoiceId: string, amount: number) => {
    trackEvent('invoice_created', {
      invoice_id: invoiceId,
      amount: amount,
    })
  },

  invoiceUpdated: (invoiceId: string, changes: string[]) => {
    trackEvent('invoice_updated', {
      invoice_id: invoiceId,
      fields_changed: changes,
    })
  },

  documentDownloaded: (documentType: 'paystub' | 'invoice' | 'report', documentId: string) => {
    trackEvent('document_downloaded', {
      document_type: documentType,
      document_id: documentId,
    })
  },

  reportGenerated: (reportType: string, dateRange: { start: string; end: string }) => {
    trackEvent('report_generated', {
      report_type: reportType,
      date_range: dateRange,
    })
  },

  // Employee management events
  employeeProfileViewed: (employeeId: string, viewerRole: string) => {
    trackEvent('employee_profile_viewed', {
      employee_id: employeeId,
      viewer_role: viewerRole,
    })
  },

  employeeUpdated: (employeeId: string, updatedFields: string[]) => {
    trackEvent('employee_updated', {
      employee_id: employeeId,
      updated_fields: updatedFields,
    })
  },

  // Error tracking
  errorOccurred: (errorType: string, errorMessage: string, context?: Record<string, unknown>) => {
    trackEvent('error_occurred', {
      error_type: errorType,
      error_message: errorMessage,
      context: context,
      timestamp: new Date().toISOString(),
    })
  },

  // Performance events
  pageLoadSlow: (pageName: string, loadTime: number) => {
    trackEvent('page_load_slow', {
      page_name: pageName,
      load_time_ms: loadTime,
    })
  },
}