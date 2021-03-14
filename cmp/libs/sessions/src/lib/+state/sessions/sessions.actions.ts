import { User } from '@cmp/interfaces';
import { createAction, props } from '@ngrx/store';
import { SessionsEntity } from './sessions.models';

export const init = createAction('[Sessions Page] Init');

export const setUser = createAction('[Sessions/API] Set User',
  props<{ user: User }>(),
);

export const loadSessionsSuccess = createAction(
  '[Sessions/API] Load Sessions Success',
  props<{ sessions: SessionsEntity[] }>()
);

export const loadSessionsFailure = createAction(
  '[Sessions/API] Load Sessions Failure',
  props<{ error: any }>()
);
