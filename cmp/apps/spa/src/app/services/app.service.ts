import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '@cmp/interfaces';

@Injectable({
  providedIn: 'root',
})
export class AppService {

  constructor(private http: HttpClient) {}

  getCsrfCookie(): Observable<any> {
    return this.http.get<any>('/sanctum/csrf-cookie');
  }

  login(userId: number): Observable<User> {
    return this.http.post<User>('/api/login', { userId });
  }

}
