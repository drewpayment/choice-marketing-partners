import { Inject, Injectable } from '@angular/core';
import { NEVER, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { User } from '@cmp/interfaces';
import { catchError } from 'rxjs/operators';
import { DOCUMENT } from '@angular/common';

@Injectable()
export class AuthService {

  constructor(private http: HttpClient, @Inject(DOCUMENT) private document: Document,) {}

  getCsrfCookie(): Observable<void> {
    return this.http.get<void>('/sanctum/csrf-cookie');
  }

  login(userId: number): Observable<User> {
    return this.http.post<User>('/api/login', { userId })
      .pipe(
        catchError(() => {
          this.document.location.href = '/login';
          return NEVER;
        }),
      );
  }

}
