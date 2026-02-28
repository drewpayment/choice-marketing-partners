// Database types for pay statement management

// Individual sale/invoice record that comprises a pay statement
export interface Sale {
  invoice_id: number;
  vendor: string;
  sale_date: string;
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  status: string;
  amount: number;
  is_active: number;
  employee_id: number;
  weekending: string;
  issue_date: string;
  created_at?: string;
  updated_at?: string;
  custom_fields?: Record<string, unknown>; // Vendor-specific custom field data (JSON)
  
  // Additional fields from joins/aggregations
  agentId?: number;
  vendorId?: number;
  issueDate?: string;
  agentName?: string;
  vendorName?: string;
}

// Main pay statement record in paystubs table
export interface PayStub {
  id: number;
  agent_id: number;
  agent_name: string;
  vendor_id: number;
  vendor_name: string;
  amount: number;
  issue_date: string;
  weekend_date: string;
  modified_by: number;
  created_at?: string;
  updated_at?: string;
}

export interface Override {
  override_id?: number;
  invoice_id?: number;
  vendor: string;
  name: string;
  commission: number;
  sales: number;
  total: number;
  employee_id: number;
  weekending: string;
  issue_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  expense_id?: number;
  invoice_id?: number;
  vendor: string;
  type: string;
  amount: number;
  notes: string;
  employee_id: number;
  weekending: string;
  issue_date: string;
  created_at?: string;
  updated_at?: string;
}

// API request/response types for pay statement management
export interface PayStatementSaveRequest {
  vendor: string;
  agentId: number;
  issueDate: string;
  weekending: string;
  sales: Omit<Sale, 'invoice_id' | 'employee_id' | 'weekending' | 'issue_date' | 'vendor' | 'created_at' | 'updated_at'>[];
  overrides: Omit<Override, 'override_id' | 'invoice_id' | 'employee_id' | 'weekending' | 'issue_date' | 'vendor' | 'created_at' | 'updated_at'>[];
  expenses: Omit<Expense, 'expense_id' | 'invoice_id' | 'employee_id' | 'weekending' | 'issue_date' | 'vendor' | 'created_at' | 'updated_at'>[];
}

export interface PayStatementDetailResponse {
  sales: Sale[];
  overrides: Override[];
  expenses: Expense[];
  totalAmount: number;
  agentName?: string;
  vendorName?: string;
  payStub?: PayStub;
}

export interface PayStatementResourcesResponse {
  payStatements: PayStub[];
  totalCount: number;
  page: number;
  limit: number;
}

// Form data types for React components
export interface PayStatementFormData {
  vendor: string;
  agentId: number;
  issueDate: string;
  weekending: string;
  sales: SaleFormData[];
  overrides: OverrideFormData[];
  expenses: ExpenseFormData[];
}

export interface SaleFormData {
  invoiceId?: number; // Add optional invoice ID for updates
  sale_date: string;
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  status: string;
  amount: number;
  is_active?: number;
  custom_fields?: Record<string, unknown>; // Vendor-specific custom field data
}

export interface OverrideFormData {
  overrideId?: number; // Add optional override ID for updates
  name: string;
  commission: number;
  sales: number;
  total: number;
}

export interface ExpenseFormData {
  expenseId?: number; // Add optional expense ID for updates
  type: string;
  amount: number;
  notes: string;
}

// Lookup types
export interface Agent {
  id: number;
  name: string;
}

export interface AgentWithSalesIds extends Agent {
  sales_id1: string | null;
  sales_id2: string | null;
  sales_id3: string | null;
}

export interface Vendor {
  id: number;
  name: string;
}

// Legacy compatibility - keeping old interface names for backwards compatibility
export type Invoice = Sale;
export type InvoiceFormData = PayStatementFormData;
export type InvoiceSaleFormData = SaleFormData;
export type InvoiceOverrideFormData = OverrideFormData;
export type InvoiceExpenseFormData = ExpenseFormData;
export type InvoiceDetailResponse = PayStatementDetailResponse;
export type InvoiceResourcesResponse = PayStatementResourcesResponse;
export type InvoiceSaveRequest = PayStatementSaveRequest;
