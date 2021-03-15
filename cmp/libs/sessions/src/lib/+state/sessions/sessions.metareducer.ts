import { ActionReducer, INIT } from '@ngrx/store';
import { State } from './sessions.reducer';
import { localStorageSync } from 'ngrx-store-localstorage';

export function debug(reducer: ActionReducer<any>): ActionReducer<any> {
  return function(state, action) {
    console.log('state', state);
    console.log('action', action);
    return reducer(state, action);
  };
}

export const rehydrateMetaReducer = (reducer: ActionReducer<State>): ActionReducer<State> => {
  return (state, action) => {
    if (action.type == INIT) {
      const storageValue = localStorage.getItem('state');
      if (storageValue) {
        try {
          return JSON.parse(storageValue);
        } catch {
          localStorage.removeItem('state');
        }
      }
    }

    const nextState = reducer(state, action);
    localStorage.setItem('state', JSON.stringify(nextState));
    return nextState;
  }
}

export function localStorageSyncReducer(reducer: ActionReducer<State>): ActionReducer<State> {
  return localStorageSync({
    keys: [{sessions: {
      encrypt: state => btoa(state),
      decrypt: state => atob(state),
    }}],
    rehydrate: true,
  })(reducer);
}
