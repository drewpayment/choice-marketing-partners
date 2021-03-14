import { Moment } from 'moment';
import { Agent } from './agent.model';
import { Expense } from './expense.model';
import { Override } from './override.model';
import { Payroll } from './payroll.model';
import { Vendor } from './vendor.model';


export interface InvoicePageResources {
  vendors: Vendor[];
  agents: Agent[];
  issueDates: Moment[] | Date[] | string[];
}

export interface EditInvoiceResources {
  campaign: Vendor;
  employee: Agent;
  expenses: Expense[];
  invoices: Invoice[];
  overrides: Override[];
  weekending: Date | Moment | string;
  issueDate: Moment;
}

export interface Invoice {
  invoiceId: number;
  vendor: number;
  saleDate: Date | Moment | string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  status: string;
  amount: string;
  agentId: number;
  issueDate: Date | Moment | string;
  wkending: Date | Moment | string;
  createdAt?: Date | Moment | string;
  updatedAt?: Date | Moment | string;
}

export interface InvoiceSaveRequest {
    vendorId: number;
    agentId: number;
    issueDate: string;
    weekending: string;
    sales: Invoice[];
    overrides: Override[];
    expenses: Expense[];
    pendingDeletes?: DeleteInvoiceItems;
}

export interface DeleteInvoiceItems {
    sales: number[];
    overrides: number[];
    expenses: number[];
}

export interface InvoiceSaveResult {
    expenses: Expense[];
    overrides: Override[];
    sales: Invoice[];
    payroll: Payroll;
}
