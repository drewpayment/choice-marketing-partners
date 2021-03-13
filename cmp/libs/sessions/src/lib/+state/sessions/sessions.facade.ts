import { Injectable } from '@angular/core';

import { select, Store, Action } from '@ngrx/store';

import * as SessionsActions from './sessions.actions';
import * as SessionsFeature from './sessions.reducer';
import * as SessionsSelectors from './sessions.selectors';

@Injectable()
export class SessionsFacade {
  /**
   * Combine pieces of state using createSelector,
   * and expose them as observables through the facade.
   */
  loaded$ = this.store.pipe(select(SessionsSelectors.getSessionsLoaded));
  allSessions$ = this.store.pipe(select(SessionsSelectors.getAllSessions));
  selectedSessions$ = this.store.pipe(select(SessionsSelectors.getSelected));

  constructor(private store: Store) {}

  /**
   * Use the initialization action to perform one
   * or more tasks in your Effects.
   */
  init() {
    this.store.dispatch(SessionsActions.init());
  }
}
