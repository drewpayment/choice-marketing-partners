import { Moment } from 'moment';
import { UserType } from './user-type.enum';
import { User } from './user.model';

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
    user?: User;
}

export interface AgentRequest extends Agent {
    password?: string;
    isCreatingUser: boolean;
    userType: UserType;
}

export interface AgentResult {
    agent: Agent;
    user: User;
}

export interface AgentSearchRequest {
  showAll: boolean;
  page: number;
  size: number;
  qry: string;
}
