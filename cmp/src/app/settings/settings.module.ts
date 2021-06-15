import { NgModule } from '@angular/core';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CompanySettingsComponent } from './company-settings/company-settings.component';
import { SettingsOutletComponent } from './settings-outlet.component';
import { Route, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MaterialModule } from '../shared/material/material.module';
import { HttpClientModule } from '@angular/common/http';
import { RunPayrollDialogComponent } from './run-payroll-dialog/run-payroll-dialog.component';

export function baseHref() {
  return window.location.pathname;
}

export const routes: Route[] = [
  {
    path: '',
    component: CompanySettingsComponent,
    pathMatch: 'full',
  },
];

@NgModule({
  declarations: [
    SettingsOutletComponent,
    CompanySettingsComponent,
    RunPayrollDialogComponent,
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,

    RouterModule.forChild(routes),
  ],
  exports: [
    CompanySettingsComponent,
  ],
  entryComponents: [
    SettingsOutletComponent,
    RunPayrollDialogComponent,
  ],
  providers: [
    {
      provide: APP_BASE_HREF,
      useFactory: baseHref,
    }
  ]
})
export class SettingsModule {}
