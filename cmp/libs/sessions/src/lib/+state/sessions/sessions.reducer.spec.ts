import { SessionsEntity } from './sessions.models';
import * as SessionsActions from './sessions.actions';
import { State, initialState, reducer } from './sessions.reducer';

describe('Sessions Reducer', () => {
  const createSessionsEntity = (id: string, name = '') =>
    ({
      id,
      name: name || `name-${id}`,
    } as SessionsEntity);

  beforeEach(() => {});

  describe('valid Sessions actions', () => {
    it('loadSessionsSuccess should return set the list of known Sessions', () => {
      const sessions = [
        createSessionsEntity('PRODUCT-AAA'),
        createSessionsEntity('PRODUCT-zzz'),
      ];
      const action = SessionsActions.loadSessionsSuccess({ sessions });

      const result: State = reducer(initialState, action);

      expect(result.loaded).toBe(true);
      expect(result.ids.length).toBe(2);
    });
  });

  describe('unknown action', () => {
    it('should return the previous state', () => {
      const action = {} as any;

      const result = reducer(initialState, action);

      expect(result).toBe(initialState);
    });
  });
});
