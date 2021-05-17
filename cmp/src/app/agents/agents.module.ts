import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AgentsListComponent } from "./agents-list/agents-list.component";
import { MaterialModule } from "../shared/material/material.module";
import { ReactiveFormsModule } from "@angular/forms";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";
import { AddAgentDialogComponent } from "./add-agent-dialog/add-agent-dialog.component";
import { EditAgentDialogComponent } from "./edit-agent-dialog/edit-agent-dialog.component";
import { ResetPasswordDialogComponent } from "./reset-password-dialog/reset-password-dialog.component";
import { NotificationSettingsDialogComponent } from './agents-list/notification-settings-dialog/notification-settings-dialog.component';

@NgModule({
  declarations: [
    AgentsListComponent,
    AddAgentDialogComponent,
    EditAgentDialogComponent,
    ResetPasswordDialogComponent,
    NotificationSettingsDialogComponent,
  ],
  imports: [
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
  ],
  exports: [AgentsListComponent],
  entryComponents: [
    AddAgentDialogComponent,
    EditAgentDialogComponent,
    ResetPasswordDialogComponent,
    NotificationSettingsDialogComponent,
  ],
})
export class AgentsModule {}
