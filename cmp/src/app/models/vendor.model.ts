import { Moment } from 'moment';

export interface Vendor {
    id: number;
    name: string;
    createdAt?: Date | Moment | string;
    updatedAt?: Date | Moment | string;
    isActive: boolean;
}
