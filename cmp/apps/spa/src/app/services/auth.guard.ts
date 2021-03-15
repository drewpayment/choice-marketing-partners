import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { ActivatedRoute, CanLoad, Route, Router, UrlSegment, UrlTree } from '@angular/router';
import { SessionsEntity, SessionsFacade } from '@cmp/sessions';
import { Observable, of } from 'rxjs';
import { catchError, filter, map, switchMap, take, tap } from 'rxjs/operators';
import { AppService } from './app.service';

@Injectable()
export class AuthGuard implements CanLoad {

  constructor(
    private facade: SessionsFacade,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  canLoad(route: Route, segments: UrlSegment[]): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    return this.getSession().pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  private getSession(): Observable<SessionsEntity> {
    return this.facade.selectedSessions$
      .pipe(
        tap(data => this.prefetch(data)),
        filter(data => !!data),
        take(1),
      )
  }

  private prefetch(session: SessionsEntity) {
    if (!session) {
      const search = this.document.location.search;
      const params = new URLSearchParams(search);
      const userId = +params.get('u');
      this.facade.loadSession(userId);
    }
  }

}
