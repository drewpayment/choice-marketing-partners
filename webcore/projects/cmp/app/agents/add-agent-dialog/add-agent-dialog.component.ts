import { Component, OnInit, ChangeDetectorRef, ViewChild, OnDestroy } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";
import { FormGroup, FormBuilder, Validators, FormControl } from "@angular/forms";
import { AccountService } from "../../account.service";
import { Country, State, Agent, UserType, AgentRequest } from "../../models";
import { Observable, of, Subject } from "rxjs";
import { catchError, debounceTime, filter, map, switchMap, takeUntil, tap } from "rxjs/operators";
import {
  MatSlideToggle,
  MatSlideToggleChange,
} from "@angular/material/slide-toggle";
import { AgentsService } from "../agents.service";
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: "cp-add-agent-dialog",
  templateUrl: "./add-agent-dialog.component.html",
  styleUrls: ["./add-agent-dialog.component.scss"],
})
export class AddAgentDialogComponent implements OnInit, OnDestroy {
  f: FormGroup = this.createForm();
  fUser: FormGroup = this.createUserForm();
  isCreatingUser = false;
  countries$!: Observable<Country[]>;
  states$!: Observable<State[]>;
  @ViewChild("overridePassword", { static: false })

  isPasswordReadonly = true;
  userTypes = {};
  destroy$ = new Subject();
  private isEmailFormValueValidated = false;

  get countryCtrl(): FormControl {
    return this.f.get('country') as FormControl;
  }

  get emailCtrl(): FormControl {
    return this.f.get('email') as FormControl;
  }

  get passwordCtrl(): FormControl {
    return this.f.get('password') as FormControl;
  }

  constructor(
    public dialogRef: MatDialogRef<AddAgentDialogComponent>,
    private fb: FormBuilder,
    private account: AccountService,
    private cd: ChangeDetectorRef,
    private service: AgentsService,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.userTypes = Object.keys(UserType).filter(
      (k) => isNaN(Number(k)) && k.trim().toLowerCase() != "superadmin"
    );

    this.countries$ = this.account.getCountries;

    this.states$ = this.countryCtrl.valueChanges.pipe(
      map((value: Country) => {
        if (value) {
          return value.States;
        } else {
          return [];
        }
      })
    );

    this.emailCtrl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        filter(() => !this.isEmailFormValueValidated),
        switchMap((email) => this.service.checkEmailValidity(email)),
        catchError(err => {
          this.snack.open(`${err}`, 'dismiss', { duration: 10000 });
          return of(false);
        }),
      )
      .subscribe(isAvailable => {
        if (!isAvailable) {
          this.emailCtrl.setErrors({
            notUnique: true,
          });
          this.snack.open(`Email in use by existing user already. Check to see if the user you're attempting to add is disabled.`, 'dismiss', { duration: 10000 });
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

  saveAgent() {
    // do some work...
    const dto = this.prepareModel();

    const isFormAgentValid = this.f.valid;
    const isFormUserValid = this.f.valid;
    const isFormsValid =
      isFormAgentValid && (this.isCreatingUser ? isFormUserValid : true);

    if (!isFormsValid) {
      this.dialogRef.close();
    }

    this.service.saveAgent(dto).subscribe((agent) => {
      this.dialogRef.close(agent);
    });
  }

  getUserTypes(): any[] {
    return Object.keys(UserType).filter(
      (t) => !isNaN(Number(t)) && Number(t) !== 1
    );
  }

  getUserTypeValue(key: any): any {
    return UserType[key];
  }

  getUserTypeDesc(key: number): string {
    const keys = Object.keys(UserType).filter((k) => isNaN(Number(k)));
    return keys[key];
  }

  toggleIsCreatingUser() {
    this.isCreatingUser = !this.isCreatingUser;
  }

  overridePasswordChange(event: MatSlideToggleChange) {
    this.isPasswordReadonly = !event.checked;

    if (event.checked) {
      this.passwordCtrl.enable();
    } else {
      this.passwordCtrl.disable();
    }
  }

  closeDialog() {
    this.dialogRef.close();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: this.fb.control("", [Validators.required]),
      email: this.fb.control("", [Validators.required]),
      phone: this.fb.control("", [Validators.required]),
      address: this.fb.control("", [Validators.required]),
      address2: this.fb.control(""),
      city: this.fb.control("", [Validators.required]),
      state: this.fb.control("", [Validators.required]),
      country: this.fb.control("", [Validators.required]),
      postalCode: this.fb.control("", [Validators.required]),
      isManager: this.fb.control(""),
      id1: this.fb.control(""),
      id2: this.fb.control(""),
      id3: this.fb.control(""),
    });
  }

  private prepareModel(): AgentRequest {
    const f = this.f.value;
    const fu = this.isCreatingUser ? this.fUser.value : null;
    const result: AgentRequest = {
      name: f.name,
      email: f.email,
      phoneNo: f.phone,
      address: f.address,
      address2: f.address2,
      city: f.city,
      state: f.state ? f.state.StateName : null,
      country: f.country ? f.country.CountryName : null,
      postalCode: f.postalCode,
      isActive: true,
      isMgr: false,
      salesId1: f.id1,
      salesId2: f.id2,
      salesId3: f.id3,
      isCreatingUser: this.isCreatingUser,
    } as AgentRequest;

    if (this.isCreatingUser) {
      result.userType = fu.userType;
      result.password = fu.password;
    }

    return result;
  }

  private createUserForm(): FormGroup {
    return this.fb.group({
      userType: this.fb.control(UserType.Employee, [Validators.required]),
      password: this.fb.control({ value: "", disabled: true }, [
        Validators.required,
      ]),
    });
  }
}
