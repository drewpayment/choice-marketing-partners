import { Inject, inject, Injectable } from '@angular/core';
import { createEffect, Actions, ofType } from '@ngrx/effects';
import { fetch } from '@nrwl/angular';
import { HttpClient } from '@angular/common/http';

import * as SessionsFeature from './sessions.reducer';
import * as SessionsActions from './sessions.actions';
import { AuthService } from '@cmp/shared';
import { DOCUMENT } from '@angular/common';
import { switchMap, map, catchError, tap, filter } from 'rxjs/operators';
import { SessionsFacade } from './sessions.facade';
import { User } from '@cmp/interfaces';
import { SessionsEntity } from '@cmp/sessions';
import { of } from 'rxjs';

@Injectable()
export class SessionsEffects {
  loadSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SessionsActions.loadSession),
      fetch({
        run: (action) => {
          return this.auth.getCsrfCookie().pipe(
            switchMap(() => this.auth.login(action.id)),
            filter(user => !!user),
            map(user => {
              const session = { sessionId: user.id, ...user } as SessionsEntity;
              return SessionsActions.loadSessionsSuccess({sessions: [session]});
            }),
          );
        },

        onError: (action, error) => {
          console.error('Error', error);
          return SessionsActions.loadSessionsFailure({ error });
        },
      })
    )
  );

  constructor(
    private actions$: Actions,
    private auth: AuthService,
    private facade: SessionsFacade,
  ) {}
}
