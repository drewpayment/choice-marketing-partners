import { SessionsEntity } from './sessions.models';
import { State, sessionsAdapter, initialState } from './sessions.reducer';
import * as SessionsSelectors from './sessions.selectors';

describe('Sessions Selectors', () => {
  const ERROR_MSG = 'No Error Available';
  const getSessionsId = (it) => it['id'];
  const createSessionsEntity = (id: string, name = '') =>
    ({
      id,
      name: name || `name-${id}`,
    } as SessionsEntity);

  let state;

  beforeEach(() => {
    state = {
      sessions: sessionsAdapter.setAll(
        [
          createSessionsEntity('PRODUCT-AAA'),
          createSessionsEntity('PRODUCT-BBB'),
          createSessionsEntity('PRODUCT-CCC'),
        ],
        {
          ...initialState,
          selectedId: 'PRODUCT-BBB',
          error: ERROR_MSG,
          loaded: true,
        }
      ),
    };
  });

  describe('Sessions Selectors', () => {
    it('getAllSessions() should return the list of Sessions', () => {
      const results = SessionsSelectors.getAllSessions(state);
      const selId = getSessionsId(results[1]);

      expect(results.length).toBe(3);
      expect(selId).toBe('PRODUCT-BBB');
    });

    it('getSelected() should return the selected Entity', () => {
      const result = SessionsSelectors.getSelected(state);
      const selId = getSessionsId(result);

      expect(selId).toBe('PRODUCT-BBB');
    });

    it("getSessionsLoaded() should return the current 'loaded' status", () => {
      const result = SessionsSelectors.getSessionsLoaded(state);

      expect(result).toBe(true);
    });

    it("getSessionsError() should return the current 'error' state", () => {
      const result = SessionsSelectors.getSessionsError(state);

      expect(result).toBe(ERROR_MSG);
    });
  });
});
