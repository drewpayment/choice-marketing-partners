import { Injectable } from '@angular/core';
import { createEffect, Actions, ofType } from '@ngrx/effects';
import { fetch } from '@nrwl/angular';

import * as SessionsFeature from './sessions.reducer';
import * as SessionsActions from './sessions.actions';

@Injectable()
export class SessionsEffects {
  init$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SessionsActions.init),
      fetch({
        run: (action) => {
          // Your custom service 'load' logic goes here. For now just return a success action...
          return SessionsActions.loadSessionsSuccess({ sessions: [] });
        },

        onError: (action, error) => {
          console.error('Error', error);
          return SessionsActions.loadSessionsFailure({ error });
        },
      })
    )
  );

  constructor(private actions$: Actions) {}
}
