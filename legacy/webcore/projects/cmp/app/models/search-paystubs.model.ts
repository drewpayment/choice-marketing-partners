import { Moment } from 'moment';

export interface SearchPaystubs {
    date: Date | Moment | string;
    campaignId: number;
    agentId: number;
}

export interface SearchPaystubsRequest {
  employees: number[];
  vendors: number[];
  startDate: Date|Moment|string;
  endDate: Date|Moment|string;
}
