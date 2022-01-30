import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Agent, Manager } from '../models';


@Injectable({
  providedIn: 'root',
})
export class ManagersService {

  constructor(private http: HttpClient) {}

  getManagers(): Observable<Manager[]> {
    return this.http.get<Manager[]>(`/api/overrides`);
  }

  getActiveEmployees(): Observable<Agent[]> {
    return this.http.get<Agent[]>(`/api/overrides/employees`);
  }

}
