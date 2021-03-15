import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetaReducer, StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import * as fromSessions from './+state/sessions/sessions.reducer';
import { SessionsEffects } from './+state/sessions/sessions.effects';
import { SessionsFacade } from './+state/sessions/sessions.facade';
import { SharedModule } from '@cmp/shared';
import { rehydrateMetaReducer, localStorageSyncReducer } from './+state/sessions/sessions.metareducer';

export const metaReducers: MetaReducer[] = [rehydrateMetaReducer];

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    StoreModule.forFeature(
      fromSessions.SESSIONS_FEATURE_KEY,
      fromSessions.reducer,
      {
        metaReducers,
      }
    ),
    EffectsModule.forFeature([SessionsEffects]),
  ],
  providers: [SessionsFacade],
})
export class SessionsModule {}
