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

    disableAgent(agentId: number): Observable<boolean> {
        const url = `ng/agents/${agentId}`;
        return this.http.delete<boolean>(url);
    }

    restoreAgent(agentId: number): Observable<boolean> {
        const url = `ng/agents/${agentId}/restore`;
        return this.http.put<boolean>(url, null);
    }

}
