import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import * as fromSessions from './+state/sessions/sessions.reducer';
import { SessionsEffects } from './+state/sessions/sessions.effects';
import { SessionsFacade } from './+state/sessions/sessions.facade';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature(
      fromSessions.SESSIONS_FEATURE_KEY,
      fromSessions.reducer
    ),
    EffectsModule.forFeature([SessionsEffects]),
  ],
  providers: [SessionsFacade],
})
export class SessionsModule {}
