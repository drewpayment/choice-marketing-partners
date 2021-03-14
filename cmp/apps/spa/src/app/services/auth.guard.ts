import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { ActivatedRoute, CanLoad, Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { SessionsFacade } from '@cmp/sessions';
import { Observable, of } from 'rxjs';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import { AppService } from './app.service';

@Injectable()
export class AuthGuard implements CanLoad {

  constructor(
    private service: AppService,
    @Inject(DOCUMENT) private document: Document,
    private sessions: SessionsFacade,
  ) {}

  canLoad(route: Route, segments: UrlSegment[]): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    const search = this.document.location.search;
    const params = new URLSearchParams(search);
    const userId = +params.get('u');

    return this.service.getCsrfCookie()
      .pipe(
        switchMap(() => this.service.login(userId)),
        map(user => {
          if (user != null) {
            console.dir(user);
            this.sessions.setUser(user);
          }
          return true;
        }),
        catchError(err => {
          console.dir(err);
          return of(false);
        }),
        map(success => success),
      );
  }

}
