import { NgModule } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFirst } from '@nrwl/angular/testing';

import { EffectsModule } from '@ngrx/effects';
import { StoreModule, Store } from '@ngrx/store';

import { NxModule } from '@nrwl/angular';

import { SessionsEntity } from './sessions.models';
import { SessionsEffects } from './sessions.effects';
import { SessionsFacade } from './sessions.facade';

import * as SessionsSelectors from './sessions.selectors';
import * as SessionsActions from './sessions.actions';
import {
  SESSIONS_FEATURE_KEY,
  State,
  initialState,
  reducer,
} from './sessions.reducer';

interface TestSchema {
  sessions: State;
}

describe('SessionsFacade', () => {
  let facade: SessionsFacade;
  let store: Store<TestSchema>;
  const createSessionsEntity = (id: string, name = '') =>
    ({
      id,
      name: name || `name-${id}`,
    } as SessionsEntity);

  beforeEach(() => {});

  describe('used in NgModule', () => {
    beforeEach(() => {
      @NgModule({
        imports: [
          StoreModule.forFeature(SESSIONS_FEATURE_KEY, reducer),
          EffectsModule.forFeature([SessionsEffects]),
        ],
        providers: [SessionsFacade],
      })
      class CustomFeatureModule {}

      @NgModule({
        imports: [
          NxModule.forRoot(),
          StoreModule.forRoot({}),
          EffectsModule.forRoot([]),
          CustomFeatureModule,
        ],
      })
      class RootModule {}
      TestBed.configureTestingModule({ imports: [RootModule] });

      store = TestBed.inject(Store);
      facade = TestBed.inject(SessionsFacade);
    });

    /**
     * The initially generated facade::loadAll() returns empty array
     */
    it('loadAll() should return empty list with loaded == true', async (done) => {
      try {
        let list = await readFirst(facade.allSessions$);
        let isLoaded = await readFirst(facade.loaded$);

        expect(list.length).toBe(0);
        expect(isLoaded).toBe(false);

        facade.init();

        list = await readFirst(facade.allSessions$);
        isLoaded = await readFirst(facade.loaded$);

        expect(list.length).toBe(0);
        expect(isLoaded).toBe(true);

        done();
      } catch (err) {
        done.fail(err);
      }
    });

    /**
     * Use `loadSessionsSuccess` to manually update list
     */
    it('allSessions$ should return the loaded list; and loaded flag == true', async (done) => {
      try {
        let list = await readFirst(facade.allSessions$);
        let isLoaded = await readFirst(facade.loaded$);

        expect(list.length).toBe(0);
        expect(isLoaded).toBe(false);

        store.dispatch(
          SessionsActions.loadSessionsSuccess({
            sessions: [
              createSessionsEntity('AAA'),
              createSessionsEntity('BBB'),
            ],
          })
        );

        list = await readFirst(facade.allSessions$);
        isLoaded = await readFirst(facade.loaded$);

        expect(list.length).toBe(2);
        expect(isLoaded).toBe(true);

        done();
      } catch (err) {
        done.fail(err);
      }
    });
  });
});
