import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { NbCardModule } from '@nebular/theme';

@NgModule({
  imports: [
    CommonModule,
  ],
  providers: [
    AuthService,
  ]
})
export class SharedModule {}
