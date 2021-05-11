import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Subject } from 'rxjs';
import { filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { CompanyOptions } from 'src/app/models';
import { RunPayrollDialogComponent } from "../run-payroll-dialog/run-payroll-dialog.component";
import { SettingsService } from '../settings.service';

@Component({
  selector: "cmp-company-settings",
  templateUrl: "./company-settings.component.html",
  styleUrls: ["./company-settings.component.scss"],
})
export class CompanySettingsComponent implements OnInit, OnDestroy {
  f = this.createForm();
  options: CompanyOptions;
  destroy$ = new Subject();

  constructor(
    private dialog: MatDialog,
    private snack: MatSnackBar,
    private fb: FormBuilder,
    private settings: SettingsService,
  ) {}

  ngOnInit() {
    this.settings.getCompanyOptions()
      .pipe(
        filter(options => options != null),
        tap(options => this.options = options),
        tap(() => {
          this.f.patchValue({
            hasPaystubNotifications: this.options.hasPaystubNotifications
          });
        }),
        switchMap(() => this.f.get('hasPaystubNotifications').valueChanges),
        takeUntil(this.destroy$),
      )
      .subscribe(value => {
        if (value != this.options.hasPaystubNotifications) {
          this.options.hasPaystubNotifications = value;
          this.settings.updateCompanyOptions(this.options).subscribe(() => {
            this.snack.open('Saved Successfully', 'dismiss', { duration: 5000 });
          });
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

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
