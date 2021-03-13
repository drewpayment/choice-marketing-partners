import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  SESSIONS_FEATURE_KEY,
  State,
  SessionsPartialState,
  sessionsAdapter,
} from './sessions.reducer';

// Lookup the 'Sessions' feature state managed by NgRx
export const getSessionsState = createFeatureSelector<
  SessionsPartialState,
  State
>(SESSIONS_FEATURE_KEY);

const { selectAll, selectEntities } = sessionsAdapter.getSelectors();

export const getSessionsLoaded = createSelector(
  getSessionsState,
  (state: State) => state.loaded
);

export const getSessionsError = createSelector(
  getSessionsState,
  (state: State) => state.error
);

export const getAllSessions = createSelector(getSessionsState, (state: State) =>
  selectAll(state)
);

export const getSessionsEntities = createSelector(
  getSessionsState,
  (state: State) => selectEntities(state)
);

export const getSelectedId = createSelector(
  getSessionsState,
  (state: State) => state.selectedId
);

export const getSelected = createSelector(
  getSessionsEntities,
  getSelectedId,
  (entities, selectedId) => selectedId && entities[selectedId]
);
