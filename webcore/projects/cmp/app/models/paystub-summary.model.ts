import { Moment } from 'moment';

export interface PaystubSummary {
    id: number;
    agentId: number;
    agentName: string;
    vendorId: number;
    vendorName: string;
    amount: number;
    issueDate?: Date | Moment | string;
    weekendDate?: Date | Moment | string;
    modifiedBy: number;
    createdAt?: Date | Moment | string;
    updatedAt?: Date | Moment | string;
}
