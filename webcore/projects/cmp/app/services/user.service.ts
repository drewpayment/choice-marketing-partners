import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { User } from '../models';


@Injectable({
  providedIn: 'root',
})
export class UserService {

  private apiV2 = environment.apiV2;

  constructor(private http: HttpClient,) {}

  getUserByEmployeeId(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiV2}/users/${id}`);
  }

}
