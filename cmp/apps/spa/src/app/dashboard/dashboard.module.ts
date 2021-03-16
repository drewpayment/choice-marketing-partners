import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from './dashboard.component';
import { DashboardRoutingModule } from './dashboard-routing.module';
import {
  NbButtonModule,
  NbCardModule,
  NbDatepickerModule,
  NbDialogModule,
  NbDialogService,
  NbFormFieldModule,
  NbIconModule,
  NbInputModule,
  NbListModule,
} from '@nebular/theme';
import { AddTaskDialogComponent } from './add-task-dialog/add-task-dialog.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NbDateFnsDateModule } from '@nebular/date-fns';

@NgModule({
  declarations: [DashboardComponent, AddTaskDialogComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NbCardModule,
    NbListModule,
    NbIconModule,
    NbButtonModule,
    NbDialogModule.forChild(),
    NbInputModule,
    NbDatepickerModule,
    NbDateFnsDateModule,
    NbFormFieldModule,

    DashboardRoutingModule,
  ],
  providers: [NbDialogService],
  entryComponents: [AddTaskDialogComponent],
})
export class DashboardModule {}
