import { Component, OnInit, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Agent, Country, State } from "../../models";
import { FormGroup, FormBuilder, Validators, FormControl } from "@angular/forms";
import { EMPTY, iif, NEVER, Observable, Observer, of } from "rxjs";
import { AccountService } from "../../account.service";
import { map, tap, first, skipWhile, switchMap } from "rxjs/operators";
import { AgentsService } from "../agents.service";
import { environment } from "src/environments/environment";
import { ZipcodeService } from "../../services/zipcode.service";
import { PhonePipe } from 'src/app/shared/pipes/phone.pipe';

@Component({
  selector: "cp-edit-agent-dialog",
  templateUrl: "./edit-agent-dialog.component.html",
  styleUrls: ["./edit-agent-dialog.component.scss"],
  providers: [PhonePipe],
})
export class EditAgentDialogComponent implements OnInit {
  f: FormGroup = this.createForm();
  private _countries!: Country[];
  countries$!: Observable<Country[]>;
  states$!: Observable<State[]>;
  private _states!: State[];
  get countryCtrl(): FormControl {
    return this.f.get('country') as FormControl;
  }

  constructor(
    public dialogRef: MatDialogRef<EditAgentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Agent,
    private fb: FormBuilder,
    private account: AccountService,
    private service: AgentsService,
    private zipcodeService: ZipcodeService,
    private phonePipe: PhonePipe,
  ) {}

  ngOnInit(): void {
    this.countries$ = this.account.getCountries.pipe(
      skipWhile((val) => !val),
      first(),
      tap((old) => (this._countries = old)),
    );

    this.states$ = this.countryCtrl.valueChanges.pipe(
      map((value: Country) => {
        if (typeof value === "object" && value !== null) {
          return value.States;
        } else if (value != null) {
          const strCountry: unknown = value;
          let normVal = (strCountry as string).trim().toLowerCase();

          if (normVal === 'us') {
            normVal = 'united states';
          }

          const selectedCountry = this._countries.find((c) => c.CountryName.trim().toLowerCase() == normVal);
          if (selectedCountry) return selectedCountry.States;
          else return [];
        }

        return [];
      }),
      tap((states) => (this._states = states)),
    );

    this.injectExistingAgentData();
  }

  injectExistingAgentData(): void {
    this.f.patchValue({
      id: this.data.id,
      name: this.data.name,
      email: this.data.email,
      phoneNo: this.phonePipe.transform(this.data.phoneNo.replace(/\D/g, '')),
      address: this.data.address,
      address2: this.data.address2,
      city: this.data.city,
      state: this.data.state,
      country: this.data.country,
      postalCode: this.data.postalCode,
      isManager: this.data.isMgr,
      id1: this.data.salesId1,
      id2: this.data.salesId2,
      id3: this.data.salesId3,
    });
  }

  saveAgent() {
    const agent = this.f.value as Agent;

    agent.phoneNo = agent.phoneNo.replace(/\D/g, '');

    if (this.f.valid) {
      this.service.updateAgent(agent)
        .subscribe(agent => {
          this.dialogRef.close(agent);
        });
    } else {
      console.dir(this.f);
    }
  }

  closeDialog() {
    this.dialogRef.close();
  }

  selectedCountry(option: Country, selection: string): boolean {
    return option.CountryName == selection;
  }

  selectedState(option: State, selection: string): boolean {
    return option.StateName == selection;
  }

  phoneMask(value: string) {
    const ctrl = this.f.get('phoneNo') as FormControl;
    const phone = value.replace(/\/D/, '');

    if (phone.length < 10) return;

    ctrl.setValue(this.phonePipe.transform(phone), { emitEvent: false, emitViewToModelChange: false });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      id: this.fb.control(""),
      name: this.fb.control("", [Validators.required]),
      email: this.fb.control("", [Validators.required]),
      phoneNo: this.fb.control("", { validators: Validators.required, updateOn: 'blur', }),
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
}
