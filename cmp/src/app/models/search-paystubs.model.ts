import { Moment } from 'moment';

export interface SearchPaystubs {
    date: Date | Moment | string;
    campaignId: number[];
    agentId: number;
}
