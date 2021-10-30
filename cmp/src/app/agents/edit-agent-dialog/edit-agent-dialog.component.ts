import { Component, OnInit, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Agent, Country, State } from "../../models";
import { FormGroup, FormBuilder, Validators } from "@angular/forms";
import { EMPTY, iif, NEVER, Observable, Observer, of } from "rxjs";
import { AccountService } from "../../account.service";
import { map, tap, first, skipWhile, switchMap } from "rxjs/operators";
import { AgentsService } from "../agents.service";
import { environment } from "src/environments/environment";
import { ZipcodeService } from "../../services/zipcode.service";

@Component({
  selector: "cp-edit-agent-dialog",
  templateUrl: "./edit-agent-dialog.component.html",
  styleUrls: ["./edit-agent-dialog.component.scss"],
})
export class EditAgentDialogComponent implements OnInit {
  f: FormGroup = this.createForm();
  private _countries: Country[];
  countries$: Observable<Country[]>;
  states$: Observable<State[]>;
  private _states: State[];

  constructor(
    public dialogRef: MatDialogRef<EditAgentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Agent,
    private fb: FormBuilder,
    private account: AccountService,
    private service: AgentsService,
    private zipcodeService: ZipcodeService
  ) {}

  ngOnInit(): void {
    this.countries$ = this.account.getCountries.pipe(
      skipWhile((val) => !val),
      first(),
      tap((old) => (this._countries = old))
    );

    this.states$ = this.f.get("country").valueChanges.pipe(
      map((value: Country) => {
        if (typeof value === "object" && value !== null) {
          return value.States;
        } else if (value != null) {
          const strCountry: unknown = value;
          const normVal = (strCountry as string).trim().toLowerCase();
          const selectedCountry = this._countries.find(
            (c) => c.CountryName.trim().toLowerCase() == normVal
          );
          if (selectedCountry) return selectedCountry.States;
          else return [];
        }

        return [];
      }),
      tap((states) => (this._states = states))
    );

    this.injectExistingAgentData();
  }

  injectExistingAgentData(): void {
    this.f.patchValue({
      id: this.data.id,
      name: this.data.name,
      email: this.data.email,
      phoneNo: this.data.phoneNo,
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
    const deferredFormValidationCheck$ = (ag: Agent) => iif(() => this.f.valid, this.service.updateAgent(ag));
    const agent = this.f.value as Agent;

    this.parseAddressFieldConversion(agent)
      .pipe(
        // update form with newly parsed address values
        tap(agent => {
          console.dir(agent);
          this.f.patchValue({
            address: agent.address,
            address2: agent.address2,
            city: agent.city,
            state: agent.state,
            country: agent.country,
            postalCode: agent.postalCode,
          });
        }),
        map(() => this.prepareModel()),
        switchMap(deferredFormValidationCheck$),
      ).subscribe((result) => this.dialogRef.close(result));
    // this doesn't work, we need to:
    // - PARSE THE ADDRESS FIRST
    // - THEN UPDATE THE ANGULAR FORM
    // -- THEN CHECK THE FORM'S VALIDITY AGAIN


    // send model to save
    // this.parseAddressFieldConversion(agent)
    //   .pipe(switchMap(deferredFormValidationCheck$))
    //   .subscribe((result) => this.dialogRef.close(result));
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

  private prepareModel(): Agent {
    const val = this.f.value;
    const result = {
      id: val && val.id ? val.id : null,
      name: val.name,
      phoneNo: val.phoneNo,
      address: val.address,
      address2: val.address2,
      city: val.city,
      state: typeof val.state === 'object' && val.state !== null ? val.state.StateName : val.state,
      country: typeof val.country === 'object' && val.country !== null ? val.countryCountryName : val.country,
      postalCode: val.postalCode,
      isMgr: val.isManager,
      salesId1: val.salesId1,
      salesId2: val.salesId2,
      salesId3: val.salesId3,
    } as Agent;

    // if (this.data.name != val.name) result.name = val.name;
    // if (this.data.email != val.email) result.email = val.email;
    // if (this.data.phoneNo != val.phoneNo) result.phoneNo = val.phoneNo;
    // if (this.data.address != val.address) result.address = val.address;
    // if (this.data.address2 != val.address2) result.address2 = val.address2;
    // if (this.data.city != val.city) result.city = val.city;
    // if (val.state != null && this.data.state != val.state.StateName)
    //   result.state = val.state.StateName;
    // if (val.country != null && this.data.country != val.country.CountryName)
    //   result.country = val.country.CountryName;
    // if (this.data.postalCode != val.postalCode)
    //   result.postalCode = val.postalCode;
    // if (this.data.isMgr != val.isManager) result.isMgr = val.isManager;
    // if (this.data.salesId1 != val.id1) result.salesId1 = val.id1;
    // if (this.data.salesId2 != val.id2) result.salesId2 = val.id2;
    // if (this.data.salesId3 != val.id3) result.salesId3 = val.id3;

    return result;
  }

  private parseAddressFieldConversion(agent: Agent): Observable<Agent> {
    if (!environment.overrideZipcodeDevelopment && !environment.production)
      return of(agent);
    let needsToBeParsed =
      (!agent.city || !agent.state || !agent.postalCode) &&
      agent.address != null;

    if (!needsToBeParsed) {
      return of(agent);
    }

    const parts = agent.address.split(" ");
    const maybeZipCode = +parts[parts.length - 1];

    if (isNaN(maybeZipCode)) {
      return of(agent);
    }

    return this.zipcodeService.getStatus().pipe(
      switchMap((status) => {
        if (status.remaining_requests < 1) {
          return EMPTY;
        }

        return this.zipcodeService.search(maybeZipCode);
      }),
      map((res) => {
        const result = res.results[maybeZipCode][0];

        agent.city = result.city;
        agent.state = result.state;
        agent.postalCode = `${maybeZipCode}`;
        agent.country = result.country_code;

        const addrParts = agent.address.split(agent.city);
        agent.address = addrParts[0].trim();

        return agent;
      })
    );
  }

  private createForm(): FormGroup {
    return this.fb.group({
      id: this.fb.control(""),
      name: this.fb.control("", [Validators.required]),
      email: this.fb.control("", [Validators.required]),
      phoneNo: this.fb.control("", [Validators.required]),
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
