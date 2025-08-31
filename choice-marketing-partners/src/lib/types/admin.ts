// Company Options Types
export interface CompanyOptionsResponse {
  id: number;
  hasPaystubNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyOptionsUpdateRequest {
  hasPaystubNotifications: boolean;
}

// Payroll Restriction Types
export interface PayrollRestrictionResponse {
  id: number;
  hour: number;
  minute: number;
  modifiedBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRestrictionUpdateRequest {
  hour: number;
  minute: number;
}

// Payroll Dates Types
export interface PayrollDate {
  issueDate: string;
  displayDate: string;
}

export interface PayrollDatesResponse {
  dates: PayrollDate[];
}

// Payroll Calculate Request
export interface PayrollCalculateRequest {
  date: string;
}

// Admin Stats Types (for dashboard)
export interface AdminStatsResponse {
  totalEmployees: number;
  pendingPayroll: number;
  systemAlerts: number;
  lastPayrollRun: string;
}
