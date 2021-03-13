import { TestBed, async } from '@angular/core/testing';

import { Observable } from 'rxjs';

import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';

import { NxModule, DataPersistence } from '@nrwl/angular';
import { hot } from '@nrwl/angular/testing';

import { SessionsEffects } from './sessions.effects';
import * as SessionsActions from './sessions.actions';

describe('SessionsEffects', () => {
  let actions: Observable<any>;
  let effects: SessionsEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NxModule.forRoot()],
      providers: [
        SessionsEffects,
        DataPersistence,
        provideMockActions(() => actions),
        provideMockStore(),
      ],
    });

    effects = TestBed.inject(SessionsEffects);
  });

  describe('init$', () => {
    it('should work', () => {
      actions = hot('-a-|', { a: SessionsActions.init() });

      const expected = hot('-a-|', {
        a: SessionsActions.loadSessionsSuccess({ sessions: [] }),
      });

      expect(effects.init$).toBeObservable(expected);
    });
  });
});
