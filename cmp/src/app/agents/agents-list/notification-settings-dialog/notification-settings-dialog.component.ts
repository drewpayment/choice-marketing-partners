/* eslint-disable */
import { Component, Inject } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { filter, tap } from "rxjs/operators";
import { SettingsService } from "src/app/settings/settings.service";
import { Agent, PaystubNotifierType, UserNotification } from "../../../models";
import { NotificationsService } from "../../../services/notifications.service";

interface DialogData {
  agent: Agent;
}

@Component({
  selector: "cmp-notification-settings-dialog",
  templateUrl: "./notification-settings-dialog.component.html",
  styleUrls: ["./notification-settings-dialog.component.scss"],
})
export class NotificationSettingsDialogComponent {
  notification!: UserNotification;
  f = this.createForm();

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: DialogData,
    private notificationService: NotificationsService,
    private ref: MatDialogRef<NotificationSettingsDialogComponent>,
    private fb: FormBuilder
  ) {
    if (!!this.data.agent.user) {
      this.notificationService
        .getUserNotificationPreferences(this.data.agent.user.uid)
        .pipe(
          filter((result) => !!result),
          tap((result) => (this.notification = result))
        )
        .subscribe((result) => this.patchForm(result));
    }
  }

  cancel() {
    this.ref.close();
  }

  save() {
    console.dir(this.f.value);
    if (this.f.invalid) return;

    const dto = this.prepareModel();

    this.notificationService
      .saveUserNotificationPreferences(dto)
      .subscribe((result) => this.ref.close(result));
  }

  private patchForm(data: UserNotification) {
    this.f.patchValue({
      hasPaystubNotifier: data.hasPaystubNotifier,
      paystubNotifierType: `${data.paystubNotifierType}`,
      notifierDestination: data.notifierDestination,
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      hasPaystubNotifier: this.fb.control(false),
      paystubNotifierType: this.fb.control(""),
      notifierDestination: this.fb.control(""),
    });
  }

  private prepareModel(): UserNotification {
    return {
      ...this.notification,
      hasPaystubNotifier: this.f.value.hasPaystubNotifier,
      paystubNotifierType: this.f.value.paystubNotifierType,
      notifierDestination: this.f.value.notifierDestination,
    };
  }
}
