import { Component } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { RunPayrollDialogComponent } from "../run-payroll-dialog/run-payroll-dialog.component";

@Component({
  selector: "cmp-company-settings",
  templateUrl: "./company-settings.component.html",
  styleUrls: ["./company-settings.component.scss"],
})
export class CompanySettingsComponent {
  f = this.createForm();

  constructor(
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private fb: FormBuilder,
  ) {}

  openRunPayrollDialog() {
    this.dialog
      .open(RunPayrollDialogComponent, {
        maxHeight: "40vh",
        maxWidth: "40vw",
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;

        this.snack.open("Payroll run!", "dismiss", { duration: 10000 });
      });
  }

  save() {
    console.dir(this.f.value);

    if (this.f.invalid) return;

    console.dir(this.f.value);
  }

  resetForm() {
    this.f.reset();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      hasPaystubNotifications: this.fb.control(false),
    });
  }
}
