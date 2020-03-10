import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Agent, Paginator, AgentRequest, AgentResult } from '../models';

@Injectable({
    providedIn: 'root'
})
export class AgentsService {

    constructor(private http: HttpClient) { }

    getAgents(showAll: boolean = false, page: number = 0, size: number = 10): Observable<Paginator<Agent>> {
        const url = 'ng/agents';
        return this.http.get<Paginator<Agent>>(url, {
            params: new HttpParams()
                .append('showall', `${showAll}`)
                .append('size', `${size}`)
                .append('page', `${page + 1}`)
        });
    }

    saveAgent(agent: AgentRequest): Observable<AgentResult> {
        const url = `ng/agents`;
        return this.http.post<AgentResult>(url, agent);
    }

}
