

export interface Payroll {
    id: number;
    agentId: number;
    agentName: string;
    amount: number;
    isPaid: boolean;
    vendorId: number;
    payDate: Date;
    createdAt?: Date;
    updatedAt?: Date;
}
