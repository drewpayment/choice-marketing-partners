import { Moment } from 'moment';

export interface Agent {
    id?: number;
    name: string;
    email: string;
    phoneNo: string;
    address: string;
    address2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    isActive: boolean;
    isAdmin?: boolean;
    isMgr: boolean;
    salesId1: string;
    salesId2: string;
    salesId3: string;
    createdAt?: Date | Moment | string;
    updatedAt?: Date | Moment | string;
    deletedAt?: Date | Moment | string;
}
