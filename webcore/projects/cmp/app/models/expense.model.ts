import { Moment } from 'moment';

export interface Expense {
  expid: number;
  vendorId: number;
  invoiceId: number;
  type: string;
  amount: number;
  notes: string;
  agentid: number;
  issueDate: Date | Moment | string;
  wkending: Date | Moment | string;
  createdAt?: Date | Moment | string;
  updatedAt?: Date | Moment | string;
}
