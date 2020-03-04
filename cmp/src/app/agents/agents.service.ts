import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Agent } from '../models';

@Injectable({
    providedIn: 'root'
})
export class AgentsService {

    constructor(private http: HttpClient) { }

    getAgents(showAll: boolean = false): Observable<Agent[]> {
        const url = 'ng/agents';
        return this.http.get<Agent[]>(url, {
            params: new HttpParams().append('showall', `${showAll}`)
        });
    }

}
