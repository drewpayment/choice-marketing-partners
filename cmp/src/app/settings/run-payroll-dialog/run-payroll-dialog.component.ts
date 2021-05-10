import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from "@angular/forms";
import { MatDialogRef } from "@angular/material/dialog";
import { SettingsService } from "../settings.service";

@Component({
  selector: "cmp-run-payroll-dialog",
  templateUrl: "./run-payroll-dialog.component.html",
  styleUrls: ["./run-payroll-dialog.component.scss"],
})
export class RunPayrollDialogComponent implements OnInit {
  f = this.createForm();
  payrollDates: Date[] = [];
  submitted = false;

  constructor(
    private ref: MatDialogRef<RunPayrollDialogComponent>,
    private fb: FormBuilder,
    private settings: SettingsService
  ) {}

  ngOnInit() {
    this.settings
      .getPayrollDates()
      .subscribe((dates) => (this.payrollDates = dates));
  }

  runPayroll() {
    this.submitted = true;

    if (this.f.invalid) return;

    this.settings.calculatePayroll(this.f.value.date).subscribe(
      (result) => {
        this.ref.close(true);
      },
      (err) => this.ref.close(false)
    );
  }

  private createForm(): FormGroup {
    return this.fb.group({
      date: this.fb.control("", [Validators.required]),
      confirmSelection: this.fb.control(false, [Validators.requiredTrue]),
    });
  }
}
