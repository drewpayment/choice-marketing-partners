import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { Agent, Paginator, AgentRequest, AgentResult, User, AgentSearchRequest } from "../models";
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: "root",
})
export class AgentsService {
  constructor(private http: HttpClient) {}

  getAgents(req: AgentSearchRequest): Observable<Paginator<Agent>> {
    const url = "ng/agents";
    return this.http.get<Paginator<Agent>>(url, {
      params: {
        showall: `${req.showAll}`,
        size: `${req.size}`,
        page: `${req.page + 1}`,
        q: req.qry,
      },
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

  updateAgent(agent: Agent): Observable<Agent> {
    console.dir(agent);
    return of(agent);
    const url = `ng/agents/${agent.id}`;
    return this.http.put<Agent>(url, agent);
  }

  adminResetAgentPassword(agent: User): Observable<Agent> {
    const url = `ng/agents/${agent.id}/password-reset`;
    return this.http.post<Agent>(url, agent);
  }

  checkEmailValidity(email: string): Observable<boolean> {
    return this.http.post<boolean>(`api/employees/email-available`, { email })
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );
  }

}
