import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SettingsService } from 'src/app/settings/settings.service';
import { Agent } from '../../../models';
import { NotificationsService } from '../../../services/notifications.service';

interface DialogData {
  agent: Agent;
}

@Component({
  selector: 'cmp-notification-settings-dialog',
  templateUrl: './notification-settings-dialog.component.html',
  styleUrls: ['./notification-settings-dialog.component.scss'],
})
export class NotificationSettingsDialogComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: DialogData,
    private settings: SettingsService,
    private notificationService: NotificationsService,
    private ref: MatDialogRef<NotificationSettingsDialogComponent>,
  ) {
    this.notificationService.getUserNotificationPreferences(data.agent.id)
      .subscribe(result => console.dir(result));
  }

}
