import { Component, OnInit, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Agent, User } from "../../models";
import { FormGroup, FormBuilder, Validators, FormControl } from "@angular/forms";
import { MatSnackBar } from "@angular/material/snack-bar";
import { AgentsService } from "../agents.service";
import { catchError } from "rxjs/operators";
import { EMPTY } from "rxjs";

interface DialogData {
  agent: Agent;
}

@Component({
  selector: "cp-reset-password-dialog",
  templateUrl: "./reset-password-dialog.component.html",
  styleUrls: ["./reset-password-dialog.component.scss"],
})
export class ResetPasswordDialogComponent implements OnInit {
  f: FormGroup = this.createForm();

  get verifyPasswordCtrl(): FormControl {
    return this.f.get('verifyPassword') as FormControl;
  }

  constructor(
    private dialogRef: MatDialogRef<ResetPasswordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Agent,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private service: AgentsService
  ) {}

  ngOnInit(): void {
    if (!this.data) {
      this.dialogRef.close();
      this.snack.open(
        "Failed to get your agent. Please refresh the page and try again.",
        "dismiss",
        { duration: 3000 }
      );
    }
  }

  closeDialog() {
    this.dialogRef.close();
  }

  savePasswordReset() {
    this.f.markAllAsTouched();
    if (this.f.invalid) return;

    if (!this.validatePasswordsMatch()) {
      this.verifyPasswordCtrl.setErrors({ mismatch: true });
      return;
    }

    const model = this.prepareModel();

    this.service
      .adminResetAgentPassword(model)
      .pipe(
        catchError(() => {
          this.snack.open(
            "Error has occurred! Password NOT reset.",
            "dismiss",
            { duration: 10000 }
          );
          this.dialogRef.close(null);
          return EMPTY;
        })
      )
      .subscribe((agent) => {
        if (agent) {
          this.dialogRef.close(agent);
          this.snack.open("Password has been reset!", "dismiss", {
            duration: 3000,
          });
        }
      });
  }

  validatePasswordsMatch(): boolean {
    const form = this.f.value;
    return form.password === form.verifyPassword;
  }

  private prepareModel(): User {
    const agent = this.data;
    if (!agent.user)  agent.user = {} as User;
    agent.user.password = this.f.value.password;
    return agent.user;
  }

  private createForm(): FormGroup {
    return this.fb.group({
      password: this.fb.control("", [Validators.required]),
      verifyPassword: this.fb.control("", [Validators.required]),
    });
  }
}
