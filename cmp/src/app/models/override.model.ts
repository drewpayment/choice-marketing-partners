import { Moment } from 'moment';

export interface Override {
  ovrid: number;
  vendorId: number;
  invoiceId?: number;
  name: string;
  sales: number;
  commission: number;
  total: number;
  agentid: number;
  issueDate: Date | Moment | string;
  wkending: Date | Moment | string;
  createdAt?: Date | Moment | string;
  updatedAt?: Date | Moment | string;
}
